use std::{convert::TryFrom, sync::Arc};

use optics_core::{
    accumulator::merkle::Proof,
    db::{HomeDB, DB},
    traits::{MessageStatus, Replica},
    Decode, OpticsMessage, Signers,
};
use optics_ethereum::EthereumReplica;

use clap::Clap;
use ethers::{
    prelude::{Http, Middleware, Provider, SignerMiddleware, H160},
    types::H256,
};

use color_eyre::{eyre::bail, Result};
use ethers_signers::{AwsSigner, Signer};

use once_cell::sync::OnceCell;
use rusoto_core::{credential::EnvironmentProvider, HttpClient};
use rusoto_kms::KmsClient;

mod replicas;
mod rpc;

static KMS_CLIENT: OnceCell<KmsClient> = OnceCell::new();

type ConcreteReplica = EthereumReplica<SignerMiddleware<Provider<Http>, Signers>>;

#[derive(Clap)]
struct Opts {
    /// Leaf index to prove
    #[clap(long)]
    leaf_index: Option<u32>,

    /// Leaf index to prove
    #[clap(long)]
    leaf_hash: Option<H256>,

    /// The name of the home chain, used to lookup keys in the db
    #[clap(long)]
    home: String,

    /// Path to db containing proof
    #[clap(long)]
    db: String,

    /// HexKey to use (please be careful)
    #[clap(long)]
    key: Option<String>,

    /// If using AWS signer, the key ID
    #[clap(long)]
    key_id: Option<String>,

    /// If using AWS signer, the region
    #[clap(long)]
    aws_region: Option<String>,

    /// replica contract address
    #[clap(long)]
    address: Option<String>,

    /// RPC connection details
    #[clap(long)]
    rpc: Option<String>,
}

impl Opts {
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
        let db = HomeDB::new(DB::from_path(&self.db)?, self.home.clone());

        let idx = match (self.leaf_index, self.leaf_hash) {
            (Some(idx), _) => idx,
            (None, Some(digest)) => match db.message_by_leaf_hash(digest)? {
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

        Ok(EthereumReplica::new("", 0, address, Arc::new(middleware)))
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let opts = Opts::parse();

    let (message, proof) = opts.fetch_proof()?;
    let replica = opts.replica(message.origin, message.destination).await?;

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
