// Code adapted from: https://github.com/althea-net/guac_rs/tree/master/web3/src/jsonrpc

use async_trait::async_trait;
use reqwest::{Client, Error as ReqwestError};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{
    str::FromStr,
    sync::atomic::{AtomicU64, Ordering},
    time::Duration,
};
use thiserror::Error;
use tokio::time::sleep;
use url::Url;

use ethers::prelude::{JsonRpcClient, ProviderError, U256};

// Code adapted from: https://github.com/althea-net/guac_rs/tree/master/web3/src/jsonrpc
use serde_json::Value;
use std::fmt;

#[derive(Serialize, Deserialize, Debug, Clone, Error)]
/// A JSON-RPC 2.0 error
pub struct JsonRpcError {
    /// The error code
    pub code: i64,
    /// The error message
    pub message: String,
    /// Additional data
    pub data: Option<Value>,
}

impl fmt::Display for JsonRpcError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "(code: {}, message: {}, data: {:?})",
            self.code, self.message, self.data
        )
    }
}

fn is_zst<T>(_t: &T) -> bool {
    std::mem::size_of::<T>() == 0
}

#[derive(Serialize, Deserialize, Debug)]
/// A JSON-RPC request
pub struct Request<'a, T> {
    id: u64,
    jsonrpc: &'a str,
    method: &'a str,
    #[serde(skip_serializing_if = "is_zst")]
    params: T,
}

#[derive(Serialize, Deserialize, Debug)]
/// A JSON-RPC Notifcation
struct Notification<R> {
    jsonrpc: String,
    method: String,
    /// Subscription
    pub params: Subscription<R>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Subscription<R> {
    pub subscription: U256,
    pub result: R,
}

impl<'a, T> Request<'a, T> {
    /// Creates a new JSON RPC request
    pub fn new(id: u64, method: &'a str, params: T) -> Self {
        Self {
            id,
            jsonrpc: "2.0",
            method,
            params,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Response<T> {
    pub(crate) id: u64,
    jsonrpc: String,
    #[serde(flatten)]
    pub data: ResponseData<T>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
enum ResponseData<R> {
    Error { error: JsonRpcError },
    Success { result: R },
}

impl<R> ResponseData<R> {
    /// Consume response and return value
    pub fn into_result(self) -> Result<R, JsonRpcError> {
        match self {
            ResponseData::Success { result } => Ok(result),
            ResponseData::Error { error } => Err(error),
        }
    }
}

/// A low-level JSON-RPC Client over HTTP.
#[derive(Debug)]
pub struct RetryingJsonRPC {
    id: AtomicU64,
    client: Client,
    url: Url,
    retries: u32,
}

#[derive(Error, Debug)]
/// Error thrown when sending an HTTP request
pub enum ClientError {
    /// Thrown if the request failed
    #[error(transparent)]
    ReqwestError(#[from] ReqwestError),
    #[error(transparent)]
    /// Thrown if the response could not be parsed
    JsonRpcError(#[from] JsonRpcError),

    #[error("Deserialization Error: {err}. Response: {text}")]
    /// Serde JSON Error
    SerdeJson {
        /// Error
        err: serde_json::Error,
        /// Text
        text: String,
    },
}

impl From<ClientError> for ProviderError {
    fn from(src: ClientError) -> Self {
        ProviderError::JsonRpcClientError(Box::new(src))
    }
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl JsonRpcClient for RetryingJsonRPC {
    type Error = ClientError;

    /// Sends a POST request with the provided method and the params serialized as JSON
    /// over HTTP
    async fn request<T: Serialize + Send + Sync, R: DeserializeOwned>(
        &self,
        method: &str,
        params: T,
    ) -> Result<R, ClientError> {
        let next_id = self.id.fetch_add(1, Ordering::SeqCst);

        let payload = Request::new(next_id, method, params);

        for _ in 0..self.retries {
            let res: Result<_, ReqwestError> = self
                .client
                .post(self.url.as_ref())
                .json(&payload)
                .send()
                .await;

            // if the res is ok, behave as normal
            if let Ok(res) = res {
                let text = res.text().await?;
                let res: Response<R> = serde_json::from_str(&text)
                    .map_err(|err| ClientError::SerdeJson { err, text })?;
                return Ok(res.data.into_result()?);
            }

            // otherwise, if the err is a 500, sleep and try again
            let e = res.unwrap_err();
            if let Some(status) = e.status() {
                if status.as_u16() >= 500 && status.as_u16() < 600 {
                    sleep(Duration::from_secs(1)).await;
                    continue;
                }
            }
            return Err(e.into());
        }
        unreachable!();
    }
}

impl RetryingJsonRPC {
    /// Initializes a new HTTP Client
    pub fn new(url: impl Into<Url>, retries: Option<u32>) -> Self {
        Self {
            id: AtomicU64::new(0),
            client: Client::new(),
            url: url.into(),
            retries: retries.unwrap_or(3),
        }
    }
}

impl FromStr for RetryingJsonRPC {
    type Err = url::ParseError;

    fn from_str(src: &str) -> Result<Self, Self::Err> {
        let url = Url::parse(src)?;
        Ok(RetryingJsonRPC::new(url, None))
    }
}

impl Clone for RetryingJsonRPC {
    fn clone(&self) -> Self {
        Self {
            id: AtomicU64::new(0),
            client: self.client.clone(),
            url: self.url.clone(),
            retries: self.retries,
        }
    }
}
