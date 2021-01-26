use async_trait::async_trait;
use color_eyre::{eyre::WrapErr, Result};
use futures_util::future::{join_all, select_all};
use std::sync::Arc;

use crate::settings::Settings;
use optics_core::traits::{Home, Replica};

/// A trait for an application that runs on a replica and a reference to a
/// home.
#[async_trait]
pub trait OpticsAgent: Send + Sync + std::fmt::Debug {
    /// Run the agent with the given home and replica
    async fn run(home: Arc<Box<dyn Home>>, replica: Box<dyn Replica>) -> Result<()>;

    /// Run several agents
    async fn run_many(home: Box<dyn Home>, replicas: Vec<Box<dyn Replica>>) -> Result<()> {
        let home = Arc::new(home);

        let mut replica_tasks: Vec<_> = replicas
            .into_iter()
            .map(|replica| Self::run(home.clone(), replica))
            .collect();

        loop {
            let (_res, _, rem) = select_all(replica_tasks).await;
            // TODO: report failure
            replica_tasks = rem;
            if replica_tasks.is_empty() {
                break;
            }
        }

        Ok(())
    }

    /// Run several agents based on the settings
    async fn run_from_settings(settings: &Settings) -> Result<()> {
        let home = settings
            .home
            .try_into_home()
            .await
            .wrap_err("failed to instantiate Home")?;

        let replicas = join_all(settings.replicas.iter().map(|(k, v)| async move {
            v.try_into_replica()
                .await
                .wrap_err_with(|| format!("Failed to instantiate replica named {}", k))
        }))
        .await
        .into_iter()
        .collect::<Result<Vec<_>>>()?;

        Self::run_many(home, replicas).await
    }
}
