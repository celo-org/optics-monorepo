use crate::{
    cancel_task, home::Homes, metrics::CoreMetrics, replica::Replicas, settings::Settings,
};
use async_trait::async_trait;
use color_eyre::{eyre::WrapErr, Result};
use futures_util::future::select_all;
use rocksdb::DB;
use tracing::instrument::Instrumented;
use tracing::Instrument;

use std::{collections::HashMap, sync::Arc};
use tokio::task::JoinHandle;
/// Properties shared across all agents
#[derive(Debug)]
pub struct AgentCore {
    /// A boxed Home
    pub home: Arc<Homes>,
    /// A map of boxed Replicas
    pub replicas: HashMap<String, Arc<Replicas>>,
    /// A persistent KV Store (currently implemented as rocksdb)
    pub db: Arc<DB>,
    /// Prometheus metrics
    pub metrics: Arc<CoreMetrics>,
}

/// A trait for an application:
///      that runs on a replica
/// and:
///     a reference to a home.
#[async_trait]
pub trait OpticsAgent: Send + Sync + std::fmt::Debug + AsRef<AgentCore> {
    /// The settings object for this agent
    type Settings: AsRef<Settings>;

    /// Instantiate the agent from the standard settings object
    async fn from_settings(settings: Self::Settings) -> Result<Self>
    where
        Self: Sized;

    /// Return a handle to the metrics registry
    fn metrics(&self) -> Arc<CoreMetrics> {
        self.as_ref().metrics.clone()
    }

    /// Return a handle to the DB
    fn db(&self) -> Arc<DB> {
        self.as_ref().db.clone()
    }

    /// Return a reference to a home contract
    fn home(&self) -> Arc<Homes> {
        self.as_ref().home.clone()
    }

    /// Get a reference to the replicas map
    fn replicas(&self) -> &HashMap<String, Arc<Replicas>> {
        &self.as_ref().replicas
    }

    /// Get a reference to a replica by its name
    fn replica_by_name(&self, name: &str) -> Option<Arc<Replicas>> {
        self.replicas().get(name).map(Clone::clone)
    }

    /// Run the agent with the given home and replica
    fn run(&self, replica: &str) -> Instrumented<JoinHandle<Result<()>>>;

    /// Run the Agent, and tag errors with the domain ID of the replica
    #[allow(clippy::unit_arg)]
    #[tracing::instrument]
    fn run_report_error(&self, replica: &str) -> Instrumented<JoinHandle<Result<()>>> {
        let m = format!("Task for replica named {} failed", replica);
        let handle = self.run(replica).in_current_span();

        let fut = async move { handle.await?.wrap_err(m) };

        tokio::spawn(fut).in_current_span()
    }

    /// Run several agents by replica name
    #[allow(clippy::unit_arg)]
    #[tracing::instrument(err)]
    async fn run_many(&self, replicas: &[&str]) -> Result<()> {
        let handles: Vec<_> = replicas
            .iter()
            .map(|replica| self.run_report_error(replica))
            .collect();

        // This gets the first future to resolve.
        let (res, _, remaining) = select_all(handles).await;

        for task in remaining.into_iter() {
            cancel_task!(task);
        }

        res?
    }

    /// Run several agents
    #[allow(clippy::unit_arg)]
    #[tracing::instrument(err)]
    async fn run_all(&self) -> Result<()> {
        let names: Vec<&str> = self.replicas().keys().map(|k| k.as_str()).collect();
        self.run_many(&names).await
    }
}
