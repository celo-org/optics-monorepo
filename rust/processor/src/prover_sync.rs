use ethers::core::types::H256;
use optics_base::{home::Homes, prover::Provers};
use optics_core::{
    accumulator::{
        incremental::IncrementalMerkle,
        prover::{ProverError, ProverTrait},
    },
    traits::{ChainCommunicationError, Common, Home},
};
use std::{sync::Arc, time::Duration};
use tokio::{
    sync::{
        oneshot::{error::TryRecvError, Receiver},
        RwLock,
    },
    time::interval,
};

/// Struct to sync prover.
#[derive(Debug)]
pub struct ProverSync {
    prover: Arc<RwLock<Provers>>,
    home: Arc<Homes>,
    incremental: IncrementalMerkle,
    rx: Receiver<()>,
}

/// ProverSync errors
#[derive(Debug, thiserror::Error)]
pub enum ProverSyncError {
    /// Local tree up-to-date but root does not match signed update"
    #[error("Local tree up-to-date but root does not match update. Local root: {local_root}. Update root: {new_root}. WARNING: this could indicate malicious updater and/or long reorganization process!")]
    MismatchedRoots {
        /// Root of prover's local merkle tree
        local_root: H256,
        /// New root contained in signed update
        new_root: H256,
    },
    /// Local root was never signed by updater and submitted to Home.
    #[error("Local root {local_root} was never signed by updater and submitted to Home.")]
    InvalidLocalRoot {
        /// Root of prover's local merkle tree
        local_root: H256,
    },
    /// ProverSync attempts Prover operation and receives ProverError
    #[error(transparent)]
    ProverError(#[from] ProverError),
    /// ProverSync receives ChainCommunicationError from chain API
    #[error(transparent)]
    ChainCommunicationError(#[from] ChainCommunicationError),
}

impl ProverSync {
    /// Instantiates a new ProverSync.
    pub fn new(prover: Arc<RwLock<Provers>>, home: Arc<Homes>, rx: Receiver<()>) -> Self {
        Self {
            prover,
            home,
            incremental: IncrementalMerkle::default(),
            rx,
        }
    }

    /// Consume self and poll for signed updates at regular interval. Update
    /// local merkle tree with all leaves between local root and
    /// new root. Use short interval for bootup syncing and longer
    /// interval for regular polling.
    #[tracing::instrument(err)]
    pub async fn poll_updates(mut self, interval_seconds: u64) -> Result<(), ProverSyncError> {
        let mut interval = interval(Duration::from_secs(interval_seconds));

        loop {
            let local_root = self.prover.read().await.root();

            let signed_update_opt = self.home.signed_update_by_old_root(local_root).await?;

            if let Some(signed_update) = signed_update_opt {
                self.update_prover_tree(local_root, signed_update.update.new_root)
                    .await?;
            } else if self
                .home
                .signed_update_by_new_root(local_root)
                .await?
                .is_none()
            {
                return Err(ProverSyncError::InvalidLocalRoot { local_root });
            }

            if let Err(TryRecvError::Closed) = self.rx.try_recv() {
                break;
            }
            interval.tick().await;
        }

        Ok(())
    }

    /// First attempt to update incremental merkle tree with all leaves
    /// produced between `local_root` and `new_root`. If successful (i.e.
    /// incremental tree is updated until its root equals the `new_root`),
    /// commit to changes by batch updating the prover's actual merkle tree.
    #[tracing::instrument(err)]
    async fn update_prover_tree(
        &mut self,
        local_root: H256,
        new_root: H256,
    ) -> Result<(), ProverSyncError> {
        // If roots don't match by end of incremental update, will return
        // MismatchedRoots error
        let leaves = self
            .update_incremental_and_return_leaves(local_root, new_root)
            .await?;

        let mut prover = self.prover.write().await;

        // Check that local root still equals prover's root just in case
        // another entity wrote to prover while we were building the leaf
        // vector. If roots no longer match, return Ok(()) and restart
        // poll_updates loop.
        if local_root != prover.root() {
            return Ok(());
        }

        prover.extend(leaves.into_iter());
        assert_eq!(new_root, prover.root());

        Ok(())
    }

    /// Given `local_root` and `new_root` from signed update, ingest leaves
    /// into incremental merkle one-by-one until local root matches new root
    /// and return ingested leaves if successful. If incremental merkle is
    /// up-to-date with update but roots still don't match, return
    /// `MismatchedRoots` error.
    #[tracing::instrument(err)]
    async fn update_incremental_and_return_leaves(
        &mut self,
        local_root: H256,
        new_root: H256,
    ) -> Result<Vec<H256>, ProverSyncError> {
        let mut leaves: Vec<H256> = Vec::new();

        // Create copy of ProverSync's incremental so we can easily discard
        // changes in case of bad update
        let mut incremental = self.incremental;
        let mut local_root = local_root;

        while local_root != new_root {
            let tree_size = incremental.count();

            // As we fill the incremental merkle, its tree_size will always be
            // equal to the index of the next leaf we want (e.g. if tree_size
            // is 3, we want the 4th leaf, which is at index 3)
            let leaf_opt = self.home.leaf_by_tree_index(tree_size).await?;

            if let Some(leaf) = leaf_opt {
                incremental.ingest(leaf);
                leaves.push(leaf);
                local_root = incremental.root();
            } else {
                // If local incremental tree is up-to-date but doesn't match new
                // root, bubble up MismatchedRoots error
                local_root = incremental.root();
                if local_root != new_root {
                    return Err(ProverSyncError::MismatchedRoots {
                        local_root,
                        new_root,
                    });
                }
            }
        }

        self.incremental = incremental;
        Ok(leaves)
    }
}

#[cfg(test)]
mod test {
    use std::sync::Arc;
    use tokio::sync::{
        oneshot::{channel, error::TryRecvError, Receiver},
        RwLock,
    };

    use ethers::signers::LocalWallet;
    use ethers::{
        core::types::{H256, U256},
        prelude::signer,
    };

    use optics_core::{
        accumulator::TREE_DEPTH,
        accumulator::{incremental::IncrementalMerkle, prover::Proof, ProverError},
        traits::{CommittedMessage, TxOutcome},
        SignedUpdate, StampedMessage, Update,
    };
    use optics_test::mocks::{MockHomeContract, MockProver};

    use super::*;

    #[tokio::test]
    async fn it_does_nothing_if_no_new_update() {
        let signer: LocalWallet =
            "1111111111111111111111111111111111111111111111111111111111111111"
                .parse()
                .unwrap();

        // Two roots contained in prover tree
        let previous_root = H256::from([0; 32]);
        let local_root = H256::from([1; 32]);

        let local_root_signed_update = Update {
            origin_domain: 1,
            previous_root,
            new_root: local_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        let mut mock_home = MockHomeContract::new();
        let mut mock_prover = MockProver::new();

        // Expect prover.root to be called once and return mock value
        // `local_root`
        mock_prover
            .expect__root()
            .times(1)
            .return_once(move || local_root);

        // Expect home.signed_update_by_new_root to be called once and return
        // mock value `local_root` (no new update for prover_sync)
        mock_home
            .expect__signed_update_by_old_root()
            .withf(move |r: &H256| *r == local_root)
            .times(1)
            .return_once(move |_| Ok(None));

        // Expect home.signed_update_by_new_root to be called once and return
        // some mock update value (only called on no new update path)
        mock_home
            .expect__signed_update_by_new_root()
            .withf(move |r: &H256| *r == local_root)
            .times(1)
            .return_once(move |_| Ok(Some(local_root_signed_update)));

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let mut prover: Arc<RwLock<Provers>> = Arc::new(RwLock::new(mock_prover.into()));
        let (tx, rx) = channel();

        {
            let prover_sync = ProverSync::new(prover.clone(), home.clone(), rx);
            drop(tx);

            prover_sync
                .poll_updates(1)
                .await
                .expect("Should have returned Ok(())");
        }

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();

        let mut mock_prover = Arc::get_mut(&mut prover).unwrap().write().await;
        mock_prover.checkpoint();
    }
}
