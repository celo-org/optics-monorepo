use async_trait::async_trait;
use color_eyre::{eyre::eyre, Result};
use std::sync::Arc;
use tokio::{
    task::JoinHandle,
    time::{interval, Interval},
};

use optics_base::{
    agent::{AgentCore, OpticsAgent},
    home::Homes,
    replica::Replicas,
};
use optics_core::traits::{Common, Replica};

use crate::settings::Settings;

/// A relayer agent
#[derive(Debug)]
pub struct Relayer {
    interval_seconds: u64,
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
    pub fn new(interval_seconds: u64, core: AgentCore) -> Self {
        Self {
            interval_seconds,
            core,
        }
    }

    #[tracing::instrument(err)]
    async fn poll_and_relay_update(home: Arc<Homes>, replica: Arc<Replicas>) -> Result<()> {
        // Get replica's current root
        let old_root = replica.current_root().await?;

        // Check for first signed update building off of the replica's current root
        let signed_update_opt = home.signed_update_by_old_root(old_root).await?;

        // If signed update exists, update replica's current root
        if let Some(signed_update) = signed_update_opt {
            replica.update(&signed_update).await?;
        }

        Ok(())
    }

    #[tracing::instrument(err)]
    async fn poll_confirm(replica: Arc<Replicas>) -> Result<()> {
        // Check for pending update that can be confirmed
        let can_confirm = replica.can_confirm().await?;

        // If valid pending update exists, confirm it
        if can_confirm {
            replica.confirm().await?;
        }

        Ok(())
    }

    fn interval(&self) -> Interval {
        interval(std::time::Duration::from_secs(self.interval_seconds))
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
            settings.polling_interval,
            settings.as_ref().try_into_core().await?,
        ))
    }

    #[tracing::instrument]
    fn run(&self, name: &str) -> JoinHandle<Result<()>> {
        let replica_opt = self.replica_by_name(name);
        let home = self.home();
        let mut interval = self.interval();
        let name = name.to_owned();

        tokio::spawn(async move {
            let replica = replica_opt.ok_or_else(|| eyre!("No replica named {}", name))?;

            loop {
                let (updated, confirmed) = tokio::join!(
                    Self::poll_and_relay_update(home.clone(), replica.clone()),
                    Self::poll_confirm(replica.clone())
                );

                if let Err(ref e) = updated {
                    tracing::error!("Error polling updates: {:?}", e)
                }
                if let Err(ref e) = confirmed {
                    tracing::error!("Error polling confirms: {:?}", e)
                }
                updated?;
                confirmed?;
                interval.tick().await;
            }
        })
    }
}

#[cfg(test)]
mod test {
    use ethers::{core::types::H256, prelude::LocalWallet};
    use std::sync::Arc;

    use super::*;
    use optics_core::{traits::TxOutcome, SignedUpdate, Update};
    use optics_test::mocks::{MockHomeContract, MockReplicaContract};

    #[tokio::test]
    async fn polls_and_relays_updates() {
        let signer: LocalWallet =
            "1111111111111111111111111111111111111111111111111111111111111111"
                .parse()
                .unwrap();

        let first_root = H256::from([1; 32]);
        let second_root = H256::from([2; 32]);

        let signed_update = Update {
            home_domain: 1,
            previous_root: first_root,
            new_root: second_root,
        }
        .sign_with(&signer)
        .await
        .expect("!sign");

        let mut mock_home = MockHomeContract::new();
        let mut mock_replica = MockReplicaContract::new();

        {
            let signed_update = signed_update.clone();
            // home.signed_update_by_old_root(first_root) called once and
            // returns mock value signed_update
            mock_home
                .expect__signed_update_by_old_root()
                .withf(move |r: &H256| *r == first_root)
                .times(1)
                .return_once(move |_| Ok(Some(signed_update)));
        }
        {
            let signed_update = signed_update.clone();
            // replica.current_root called once and returns mock value
            // first_root
            mock_replica
                .expect__current_root()
                .times(1)
                .returning(move || Ok(first_root));
            // replica.update(signed_update) called once and returns
            // mock default value
            mock_replica
                .expect__update()
                .withf(move |s: &SignedUpdate| *s == signed_update)
                .times(1)
                .returning(|_| {
                    Ok(TxOutcome {
                        txid: H256::default(),
                        executed: true,
                    })
                });
        }

        let mut home: Arc<Homes> = Arc::new(mock_home.into());
        let mut replica: Arc<Replicas> = Arc::new(mock_replica.into());
        Relayer::poll_and_relay_update(home.clone(), replica.clone())
            .await
            .expect("Should have returned Ok(())");

        let mock_home = Arc::get_mut(&mut home).unwrap();
        mock_home.checkpoint();

        let mock_replica = Arc::get_mut(&mut replica).unwrap();
        mock_replica.checkpoint();
    }

    #[tokio::test]
    async fn confirms_updates() {
        let mut mock_replica = MockReplicaContract::new();
        // replica.can_confirm called once and returns mock true
        mock_replica
            .expect__can_confirm()
            .times(1)
            .returning(|| Ok(true));
        // replica.confirm called once and returns mock default
        mock_replica.expect__confirm().times(1).returning(|| {
            Ok(TxOutcome {
                txid: H256::default(),
                executed: true,
            })
        });

        let mut replica: Arc<Replicas> = Arc::new(mock_replica.into());
        Relayer::poll_confirm(replica.clone())
            .await
            .expect("Should have returned Ok(())");

        let mock_replica = Arc::get_mut(&mut replica).unwrap();
        mock_replica.checkpoint();
    }
}
