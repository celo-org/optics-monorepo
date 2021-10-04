use std::time::Duration;

use rusoto_core::{credential::EnvironmentProvider, HttpClient, Region, RusotoError};
use rusoto_s3::{GetObjectError, GetObjectRequest, PutObjectRequest, S3Client, S3};

use color_eyre::eyre::{bail, Result};

use optics_core::{accumulator::merkle::Proof, db::HomeDB};
use tokio::{task::JoinHandle, time::sleep};
use tracing::{debug, info, info_span, instrument::Instrumented, Instrument};

/// Pushes proofs to an S3 bucket
pub struct Pusher {
    name: String,
    bucket: String,
    region: Region,
    db: HomeDB,
    client: S3Client,
}

impl std::fmt::Debug for Pusher {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Pusher")
            .field("region", &self.region)
            .field("bucket", &self.bucket)
            .field("name", &self.name)
            .finish()
    }
}

impl Pusher {
    /// Instantiate a new pusher with a region
    pub fn new(name: &str, bucket: &str, region: Region, db: HomeDB) -> Self {
        let client = S3Client::new_with(
            HttpClient::new().unwrap(),
            EnvironmentProvider::default(),
            region.clone(),
        );
        Self {
            name: name.to_owned(),
            bucket: bucket.to_owned(),
            region,
            db,
            client,
        }
    }

    async fn upload_proof(&self, proof: &Proof) -> Result<()> {
        let proof_json = Vec::from(serde_json::to_string_pretty(&proof)?);
        let req = PutObjectRequest {
            key: self.key(proof),
            bucket: self.bucket.clone(),
            body: Some(proof_json.into()),
            content_type: Some("application/json".to_owned()),
            ..Default::default()
        };
        info!(
            leaf = ?proof.leaf,
            leaf_index = proof.index,
            key = %self.key(proof),
            "Storing proof in s3 bucket",
        );
        self.client.put_object(req).await?;
        Ok(())
    }

    async fn already_uploaded(&self, proof: &Proof) -> Result<bool> {
        let req = GetObjectRequest {
            key: self.key(proof),
            bucket: self.bucket.clone(),
            ..Default::default()
        };
        let resp = self.client.get_object(req).await;

        match resp {
            Ok(_) => {
                debug!(
                    leaf = ?proof.leaf,
                    leaf_index = proof.index,
                    key = %self.key(proof),
                    "Proof already stored in bucket"
                );
                Ok(true)
            }
            Err(RusotoError::Service(GetObjectError::NoSuchKey(_))) => Ok(false),
            Err(e) => bail!(e),
        }
    }

    fn key(&self, proof: &Proof) -> String {
        format!("{}_{}", self.name, proof.index)
    }

    /// Spawn the pusher task and return a joinhandle
    ///
    /// The pusher task polls the DB for new proofs and attempts to push them
    /// to an S3 bucket
    pub fn spawn(self) -> Instrumented<JoinHandle<Result<()>>> {
        let span = info_span!(
            "ProofPusher",
            bucket = %self.bucket,
            region = self.region.name(),
            home = %self.name,
        );
        tokio::spawn(async move {
            let mut index = 0;
            loop {
                let proof = self.db.proof_by_leaf_index(index)?;

                match proof {
                    Some(proof) => {
                        // upload if not already present
                        if !self.already_uploaded(&proof).await? {
                            self.upload_proof(&proof).await?;
                        }

                        index += 1;
                    }
                    None => sleep(Duration::from_millis(500)).await,
                }
            }
        })
        .instrument(span)
    }
}
