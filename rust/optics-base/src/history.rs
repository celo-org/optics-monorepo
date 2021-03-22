use color_eyre::{eyre::bail, Report, Result};
use thiserror::Error;

use ethers::core::types::H256;
use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};
use tokio::{
    sync::mpsc,
    task::JoinHandle,
    time::{interval, Interval},
};

use crate::Homes;
use optics_core::{
    traits::{Common, DoubleUpdate},
    SignedUpdate,
};

#[derive(Debug, Error)]
enum HistorySyncError {
    #[error("Syncing finished")]
    SyncingFinished,
}

/// Struct responsible for syncing agent with history of updates
#[derive(Debug)]
pub struct HistorySync<C>
where
    C: Common + ?Sized + 'static,
{
    interval_seconds: u64,
    current_root: H256,
    tx: mpsc::Sender<SignedUpdate>,
    contract: Arc<C>,
}

impl<C> HistorySync<C>
where
    C: Common + ?Sized + 'static,
{
    /// Instantiates new HistorySync
    pub fn new(
        interval_seconds: u64,
        from: H256,
        tx: mpsc::Sender<SignedUpdate>,
        contract: Arc<C>,
    ) -> Self {
        Self {
            current_root: from,
            tx,
            contract,
            interval_seconds,
        }
    }

    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
    }

    async fn update_history(&mut self) -> Result<()> {
        let previous_update = self
            .contract
            .signed_update_by_new_root(self.current_root)
            .await?;

        if previous_update.is_none() {
            // Task finished
            return Err(Report::new(HistorySyncError::SyncingFinished));
        }

        // Dispatch to the handler
        let previous_update = previous_update.unwrap();

        // set up for next loop iteration
        self.current_root = previous_update.update.previous_root;
        self.tx.send(previous_update).await?;
        if self.current_root.is_zero() {
            // Task finished
            return Err(Report::new(HistorySyncError::SyncingFinished));
        }

        Ok(())
    }

    /// Loops and calls `update_history` until no more updates available
    /// through chain API
    #[tracing::instrument]
    pub fn spawn(mut self) -> JoinHandle<Result<()>> {
        tokio::spawn(async move {
            let mut interval = self.interval();

            loop {
                let res = self.update_history().await;
                if res.is_err() {
                    // Syncing done
                    break;
                }

                interval.tick().await;
            }

            Ok(())
        })
    }
}

/// Struct responsible for receiving and handling updates sent
/// through channel
#[derive(Debug)]
pub struct UpdateHandler {
    rx: mpsc::Receiver<SignedUpdate>,
    history: Arc<RwLock<HashMap<H256, SignedUpdate>>>,
    home: Arc<Homes>,
}

impl UpdateHandler {
    /// Instantiates a new UpdateHandler
    pub fn new(
        rx: mpsc::Receiver<SignedUpdate>,
        history: Arc<RwLock<HashMap<H256, SignedUpdate>>>,
        home: Arc<Homes>,
    ) -> Self {
        Self { rx, history, home }
    }

    /// Checks if received update is double update and updates history
    pub fn check_double_and_update_history(
        &mut self,
        update: &SignedUpdate,
    ) -> Result<(), DoubleUpdate> {
        let old_root = update.update.previous_root;
        let new_root = update.update.new_root;

        let mut history_write = self.history.write().unwrap();

        #[allow(clippy::map_entry)]
        if !history_write.contains_key(&old_root) {
            history_write.insert(old_root, update.to_owned());
            return Ok(());
        }

        let existing = history_write.get(&old_root).expect("!contains");
        if existing.update.new_root != new_root {
            return Err(DoubleUpdate(existing.to_owned(), update.to_owned()));
        }

        Ok(())
    }

    /// Spawns UpdateHandler loop. Note that if fraudulent update
    /// received from replica, two conflicting updates between home and
    /// replica will show up in history and be flagged as double update.
    #[tracing::instrument]
    pub fn spawn(mut self) -> JoinHandle<Result<DoubleUpdate>> {
        tokio::spawn(async move {
            loop {
                let update = self.rx.recv().await;
                // channel is closed
                if update.is_none() {
                    bail!("Channel closed.")
                }

                let update = update.unwrap();
                let old_root = update.update.previous_root;

                if old_root == self.home.current_root().await? {
                    // It is okay if tx reverts
                    let _ = self.home.update(&update).await;
                }

                // Check for double update and update history
                if let Err(double_update) = self.check_double_and_update_history(&update) {
                    return Ok(double_update);
                }
            }
        })
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::mpsc;

    use ethers::core::types::H256;
    use ethers::signers::LocalWallet;

    use crate::Homes;
    use optics_core::Update;
    use optics_test::mocks::MockHomeContract;

    #[tokio::test]
    async fn history_sync_updates_history() {
        let signer: LocalWallet =
            "1111111111111111111111111111111111111111111111111111111111111111"
                .parse()
                .unwrap();

        let zero_root = H256::zero(); // Original zero root
        let first_root = H256::from([1; 32]);
        let second_root = H256::from([2; 32]);

        // Zero root to first root
        let first_signed_update = Update {
            origin_domain: 1,
            previous_root: zero_root,
            new_root: first_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        // First root to second root
        let second_signed_update = Update {
            origin_domain: 1,
            previous_root: first_root,
            new_root: second_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        let mut mock_home = MockHomeContract::new();
        {
            let first_signed_update = first_signed_update.clone();
            let second_signed_update = second_signed_update.clone();
            // home.signed_update_by_new_root called once with second_root
            // and returns mock value second_signed_update
            mock_home
                .expect__signed_update_by_new_root()
                .withf(move |r: &H256| *r == second_root)
                .times(1)
                .return_once(move |_| Ok(Some(second_signed_update)));
            // home.signed_update_by_new_root called once with first_root
            // and returns mock value first_signed_update
            mock_home
                .expect__signed_update_by_new_root()
                .withf(move |r: &H256| *r == first_root)
                .times(1)
                .return_once(move |_| Ok(Some(first_signed_update)));
        }

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let (tx, mut rx) = mpsc::channel(200);
        {
            let mut history_sync = HistorySync::new(3, second_root, tx.clone(), home.clone());

            // First update_history call returns first -> second update
            history_sync
                .update_history()
                .await
                .expect("Should have received Ok(())");

            assert_eq!(history_sync.current_root, first_root);
            assert_eq!(rx.recv().await.unwrap(), second_signed_update);

            // Second update_history call returns zero -> first update
            // and should return HistorySyncError::SyncingFinished
            history_sync
                .update_history()
                .await
                .expect_err("Should have received HistorySyncError::SyncingFinished");

            assert_eq!(history_sync.current_root, zero_root);
            assert_eq!(rx.recv().await.unwrap(), first_signed_update)
        }

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();
    }

    #[tokio::test]
    async fn update_handler_detects_double_update() {
        let signer: LocalWallet =
            "1111111111111111111111111111111111111111111111111111111111111111"
                .parse()
                .unwrap();

        let first_root = H256::from([1; 32]);
        let second_root = H256::from([2; 32]);
        let third_root = H256::from([3; 32]);
        let bad_third_root = H256::from([4; 32]);

        let first_update = Update {
            origin_domain: 1,
            previous_root: first_root,
            new_root: second_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        let second_update = Update {
            origin_domain: 1,
            previous_root: second_root,
            new_root: third_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        let bad_second_update = Update {
            origin_domain: 1,
            previous_root: second_root,
            new_root: bad_third_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        let (_tx, rx) = mpsc::channel(200);
        let mut handler = UpdateHandler {
            rx,
            history: Default::default(),
            home: Arc::new(MockHomeContract::new().into()),
        };

        let _first_update_ret = handler
            .check_double_and_update_history(&first_update)
            .expect("Update should have been valid");

        let _second_update_ret = handler
            .check_double_and_update_history(&second_update)
            .expect("Update should have been valid");

        let bad_second_update_ret = handler
            .check_double_and_update_history(&bad_second_update)
            .expect_err("Update should have been invalid");
        assert_eq!(
            bad_second_update_ret,
            DoubleUpdate(second_update, bad_second_update)
        );
    }
}
