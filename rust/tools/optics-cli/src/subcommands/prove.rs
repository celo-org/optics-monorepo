use std::{convert::TryFrom, sync::Arc};
use structopt::StructOpt;

use crate::{replicas, rpc};

use optics_core::{
    accumulator::merkle::Proof,
    db::{OpticsDB, DB},
    ContractLocator, Decode, MessageStatus, OpticsMessage, Replica, Signers,
};
use optics_ethereum::EthereumReplica;

use ethers::{
    prelude::{Http, Middleware, Provider, SignerMiddleware, H160},
    types::H256,
};

use color_eyre::{eyre::bail, Result};
use ethers_signers::{AwsSigner, Signer};

use once_cell::sync::OnceCell;
use rusoto_core::{credential::EnvironmentProvider, HttpClient};
use rusoto_kms::KmsClient;

static KMS_CLIENT: OnceCell<KmsClient> = OnceCell::new();

type ConcreteReplica = EthereumReplica<SignerMiddleware<Provider<Http>, Signers>>;

#[derive(StructOpt, Debug)]
pub struct ProveCommand {
    /// Leaf to prove
    #[structopt(long, required_unless = "leaf_index")]
    leaf: Option<H256>,

    /// Leaf index to prove
    #[structopt(long, required_unless = "leaf")]
    leaf_index: Option<u32>,

    /// The name of the home chain, used to lookup keys in the db
    #[structopt(long)]
    home_name: String,

    /// Path to db containing proof
    #[structopt(long)]
    db_path: String,

    /// HexKey to use (please be careful)
    #[structopt(long)]
    key: Option<String>,

    /// If using AWS signer, the key ID
    #[structopt(long)]
    key_id: Option<String>,

    /// If using AWS signer, the region
    #[structopt(long)]
    aws_region: Option<String>,

    /// replica contract address
    #[structopt(long)]
    address: Option<String>,

    /// RPC connection details
    #[structopt(long)]
    rpc: Option<String>,
}

impl ProveCommand {
    pub async fn run(&self) -> Result<()> {
        let (message, proof) = self.fetch_proof()?;
        let replica = self.replica(message.origin, message.destination).await?;

        let status = replica.message_status(message.to_leaf()).await?;
        let outcome = match status {
            MessageStatus::None => replica.prove_and_process(&message, &proof).await?,
            MessageStatus::Proven => replica.process(&message).await?,
            _ => {
                println!("Message already processed.");
                return Ok(());
            }
        };

        println!("{:?}", outcome);
        Ok(())
    }

    // mostly copied from optics-base settings
    async fn signer(&self) -> Result<Signers> {
        if let Some(key) = &self.key {
            Ok(Signers::Local(key.parse()?))
        } else {
            match (&self.key_id, &self.aws_region) {
                (Some(id), Some(region)) => {
                    let client = KMS_CLIENT.get_or_init(|| {
                        KmsClient::new_with_client(
                            rusoto_core::Client::new_with(
                                EnvironmentProvider::default(),
                                HttpClient::new().unwrap(),
                            ),
                            region.parse().expect("invalid region"),
                        )
                    });
                    let signer = AwsSigner::new(client, id, 0).await?;
                    Ok(Signers::Aws(signer))
                }

                _ => bail!("missing signer information"),
            }
        }
    }

    fn fetch_proof(&self) -> Result<(OpticsMessage, Proof)> {
        let db = OpticsDB::new(self.home_name.to_owned(), DB::from_path(&self.db_path)?);

        let idx = match (self.leaf_index, self.leaf) {
            (Some(idx), _) => idx,
            (None, Some(digest)) => match db.message_by_leaf(digest)? {
                Some(leaf) => leaf.leaf_index,
                None => bail!("No leaf index or "),
            },
            (None, None) => bail!("Must provide leaf index or leaf hash"),
        };

        let proof = db.proof_by_leaf_index(idx)?.expect("no proof");
        let message = db.message_by_leaf_index(idx)?.expect("no message");
        let message = OpticsMessage::read_from(&mut message.message.as_slice())?;

        Ok((message, proof))
    }

    async fn replica(&self, origin: u32, destination: u32) -> Result<ConcreteReplica> {
        // bit ugly. Tries passed-in rpc first, then defaults to lookup by
        // domain
        let provider = self
            .rpc
            .as_ref()
            .map(|rpc| Provider::<Http>::try_from(rpc.as_ref()))
            .transpose()?
            .unwrap_or_else(|| rpc::fetch_rpc_connection(destination).unwrap());

        let chain_id = provider.get_chainid().await?;
        let signer = self.signer().await?.with_chain_id(chain_id.low_u64());
        let middleware = SignerMiddleware::new(provider, signer);

        // bit ugly. Tries passed-in address first, then defaults to lookup by
        // domain
        let address = self
            .address
            .as_ref()
            .map(|addr| addr.parse::<H160>())
            .transpose()?
            .unwrap_or_else(|| replicas::address_by_domain_pair(origin, destination).unwrap());

        Ok(EthereumReplica::new(
            Arc::new(middleware),
            &ContractLocator {
                name: "".into(),
                domain: 0,
                address: address.into(),
            },
        ))
    }
}
