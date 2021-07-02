use async_trait::async_trait;
use color_eyre::{eyre::bail, Result};
use futures_util::future::select_all;
use std::{sync::Arc, time::Duration};
use tokio::{join, sync::Mutex, task::JoinHandle, time::sleep};
use tracing::info;

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    home::Homes,
    replica::Replicas,
};
use optics_core::traits::{Common, Replica};

use crate::settings::RelayerSettings as Settings;

#[derive(Debug)]
struct UpdatePoller {
    duration: Duration,
    home: Arc<Homes>,
    replica: Arc<Replicas>,
    semaphore: Mutex<()>,
}

impl UpdatePoller {
    fn new(home: Arc<Homes>, replica: Arc<Replicas>, duration: u64) -> Self {
        Self {
            home,
            replica,
            duration: Duration::from_secs(duration),
            semaphore: Mutex::new(()),
        }
    }

    #[tracing::instrument(err)]
    async fn poll_and_relay_update(&self) -> Result<()> {
        // Get replica's current root.
        // If the replica has a queue of pending updates, we use the last queue
        // root instead
        let (old_root_res, queue_end_res) =
            join!(self.replica.current_root(), self.replica.queue_end());

        let old_root = {
            if let Some(end) = queue_end_res? {
                end
            } else {
                old_root_res?
            }
        };

        info!(
            "Replica {} latest root is: {}",
            self.replica.name(),
            old_root
        );

        // Check for first signed update building off of the replica's current root
        let signed_update_opt = self.home.signed_update_by_old_root(old_root).await?;

        // If signed update exists, update replica's current root
        if let Some(signed_update) = signed_update_opt {
            info!(
                "Update for replica {}. Root {} to {}",
                self.replica.name(),
                &signed_update.update.previous_root,
                &signed_update.update.new_root,
            );

            let lock = self.semaphore.try_lock();
            if lock.is_err() {
                return Ok(()); // tx in flight. just do nothing
            }
            // don't care if it succeeds
            let _ = self.replica.update(&signed_update).await;
            // lock dropped here
        } else {
            info!(
                "No update. Current root for replica {} is {}",
                self.replica.name(),
                old_root
            );
        }

        Ok(())
    }

    fn spawn(self) -> JoinHandle<Result<()>> {
        tokio::spawn(async move {
            loop {
                self.poll_and_relay_update().await?;
                sleep(self.duration).await;
            }
        })
    }
}

#[derive(Debug)]
struct ConfirmPoller {
    replica: Arc<Replicas>,
    duration: Duration,
    semaphore: Mutex<()>,
}

impl ConfirmPoller {
    fn new(replica: Arc<Replicas>, duration: u64) -> Self {
        Self {
            replica,
            duration: Duration::from_secs(duration),
            semaphore: Mutex::new(()),
        }
    }

    #[tracing::instrument(err)]
    async fn poll_confirm(&self) -> Result<()> {
        // Check for pending update that can be confirmed
        let can_confirm = self.replica.can_confirm().await?;

        // If valid pending update exists, confirm it
        if can_confirm {
            let lock = self.semaphore.try_lock();
            if lock.is_err() {
                // A tx is in-flight. Do nothing.
                return Ok(());
            }
            info!("Can confirm. Confirming on replica {}", self.replica.name());
            // don't care if it succeeds
            let _ = self.replica.confirm().await;
            // lock dropped here
        } else {
            info!("Can't confirm on replica {}", self.replica.name());
        }

        Ok(())
    }

    fn spawn(self) -> JoinHandle<Result<()>> {
        tokio::spawn(async move {
            loop {
                self.poll_confirm().await?;
                sleep(self.duration).await;
            }
        })
    }
}

/// A relayer agent
#[derive(Debug)]
pub struct Relayer {
    duration: u64,
    core: AgentCore,
}

impl AsRef<AgentCore> for Relayer {
    fn as_ref(&self) -> &AgentCore {
        &self.core
    }
}

#[allow(clippy::unit_arg)]
impl Relayer {
    /// Instantiate a new relayer
    pub fn new(duration: u64, core: AgentCore) -> Self {
        Self { duration, core }
    }
}

#[async_trait]
#[allow(clippy::unit_arg)]
impl OpticsAgent for Relayer {
    type Settings = Settings;

    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized,
    {
        Ok(Self::new(
            settings.polling_interval.parse().expect("invalid uint"),
            settings.as_ref().try_into_core().await?,
        ))
    }

    #[tracing::instrument]
    fn run(&self, name: &str) -> JoinHandle<Result<()>> {
        let replica_opt = self.replica_by_name(name);
        let home = self.home();
        let name = name.to_owned();

        let duration = self.duration;

        tokio::spawn(async move {
            if replica_opt.is_none() {
                bail!("No replica named {}", name);
            }
            let replica = replica_opt.unwrap();

            let update_poller = UpdatePoller::new(home, replica.clone(), duration);
            let update_task = update_poller.spawn();

            let confirm_poller = ConfirmPoller::new(replica, duration);
            let confirm_task = confirm_poller.spawn();

            let (res, _, _) = select_all(vec![confirm_task, update_task]).await;

            res?
        })
    }
}

#[cfg(test)]
mod test {
    // // TODO: refactor and re-enable

    // use ethers::{core::types::H256, prelude::LocalWallet};
    // use std::sync::Arc;

    // use super::*;
    // use optics_core::{traits::TxOutcome, SignedUpdate, Update};
    // use optics_test::mocks::{MockHomeContract, MockReplicaContract};

    // #[tokio::test]
    // async fn polls_and_relays_updates() {
    //     let signer: LocalWallet =
    //         "1111111111111111111111111111111111111111111111111111111111111111"
    //             .parse()
    //             .unwrap();

    //     let first_root = H256::from([1; 32]);
    //     let second_root = H256::from([2; 32]);

    //     let signed_update = Update {
    //         home_domain: 1,
    //         previous_root: first_root,
    //         new_root: second_root,
    //     }
    //     .sign_with(&signer)
    //     .await
    //     .expect("!sign");

    //     let mut mock_home = MockHomeContract::new();
    //     let mut mock_replica = MockReplicaContract::new();

    //     {
    //         let signed_update = signed_update.clone();
    //         // home.signed_update_by_old_root(first_root) called once and
    //         // returns mock value signed_update
    //         mock_home
    //             .expect__signed_update_by_old_root()
    //             .withf(move |r: &H256| *r == first_root)
    //             .times(1)
    //             .return_once(move |_| Ok(Some(signed_update)));
    //     }
    //     {
    //         let signed_update = signed_update.clone();
    //         // replica.current_root called once and returns mock value
    //         // first_root
    //         mock_replica
    //             .expect__current_root()
    //             .times(1)
    //             .returning(move || Ok(first_root));
    //         // replica.update(signed_update) called once and returns
    //         // mock default value
    //         mock_replica
    //             .expect__update()
    //             .withf(move |s: &SignedUpdate| *s == signed_update)
    //             .times(1)
    //             .returning(|_| {
    //                 Ok(TxOutcome {
    //                     txid: H256::default(),
    //                     executed: true,
    //                 })
    //             });
    //     }

    //     let mut home: Arc<Homes> = Arc::new(mock_home.into());
    //     let mut replica: Arc<Replicas> = Arc::new(mock_replica.into());
    //     Relayer::poll_and_relay_update(home.clone(), replica.clone())
    //         .await
    //         .expect("Should have returned Ok(())");

    //     let mock_home = Arc::get_mut(&mut home).unwrap();
    //     mock_home.checkpoint();

    //     let mock_replica = Arc::get_mut(&mut replica).unwrap();
    //     mock_replica.checkpoint();
    // }

    // #[tokio::test]
    // async fn confirms_updates() {
    //     let mut mock_replica = MockReplicaContract::new();
    //     // replica.can_confirm called once and returns mock true
    //     mock_replica
    //         .expect__can_confirm()
    //         .times(1)
    //         .returning(|| Ok(true));
    //     // replica.confirm called once and returns mock default
    //     mock_replica.expect__confirm().times(1).returning(|| {
    //         Ok(TxOutcome {
    //             txid: H256::default(),
    //             executed: true,
    //         })
    //     });

    //     let mut replica: Arc<Replicas> = Arc::new(mock_replica.into());
    //     Relayer::poll_confirm(replica.clone())
    //         .await
    //         .expect("Should have returned Ok(())");

    //     let mock_replica = Arc::get_mut(&mut replica).unwrap();
    //     mock_replica.checkpoint();
    // }
}
