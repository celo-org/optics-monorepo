use std::{fmt::Debug, str::FromStr, time::Duration};

use async_trait::async_trait;
use ethers::{
    prelude::{JsonRpcClient, ProviderError},
    providers::Http,
};
use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;
use tokio::time::sleep;

#[derive(Debug, Clone)]
pub struct RetryingProvider {
    inner: Http,
    max_requests: usize,
}

impl RetryingProvider {
    pub fn new(inner: Http, max_requests: usize) -> Self {
        Self {
            inner,
            max_requests,
        }
    }
    pub fn max_requests(&mut self, max_requests: usize) {
        self.max_requests = max_requests;
    }
}

#[derive(Error, Debug)]
pub enum RetryingProviderError {
    /// An internal error in the JSON RPC Client
    #[error(transparent)]
    JsonRpcClientError(#[from] Box<dyn std::error::Error + Send + Sync>),

    /// Hit max requests
    #[error("Hit max requests")]
    MaxRequests,
}

impl From<RetryingProviderError> for ProviderError {
    fn from(src: RetryingProviderError) -> Self {
        ProviderError::JsonRpcClientError(Box::new(src))
    }
}

#[async_trait]
impl JsonRpcClient for RetryingProvider {
    type Error = RetryingProviderError;

    async fn request<T, R>(&self, method: &str, params: T) -> Result<R, Self::Error>
    where
        T: Debug + Serialize + Send + Sync,
        R: Serialize + DeserializeOwned,
    {
        for i in 0..self.max_requests {
            {
                let res = self.inner.request(method, &params).await;
                if res.is_ok() {
                    return Ok(res.expect("checked"));
                }
            }
            sleep(Duration::from_millis((2u64.pow(i as u32)) * 1000)).await;
        }

        return Err(RetryingProviderError::MaxRequests);
    }
}

impl FromStr for RetryingProvider {
    type Err = url::ParseError;

    fn from_str(src: &str) -> Result<Self, Self::Err> {
        Ok(Self::new(src.parse()?, 6))
    }
}
