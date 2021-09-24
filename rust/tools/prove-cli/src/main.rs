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
    prelude::{Http, Provider, SignerMiddleware},
    types::H256,
};

use color_eyre::{eyre::bail, Result};
use ethers_signers::AwsSigner;

use once_cell::sync::OnceCell;
use rusoto_core::{credential::EnvironmentProvider, HttpClient};
use rusoto_kms::KmsClient;

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
    address: String,

    /// RPC connection details
    #[clap(long)]
    rpc: String,
}

impl Opts {
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
        let db = HomeDB::new(DB::from_path(&self.db)?, self.rpc.clone());

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

    async fn replica(&self) -> Result<ConcreteReplica> {
        let provider = Provider::<Http>::try_from(self.rpc.as_ref())?;
        let signer = self.signer().await?;
        let middleware = SignerMiddleware::new(provider, signer);
        Ok(EthereumReplica::new(
            "",
            0,
            self.address.parse()?,
            Arc::new(middleware),
        ))
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let opts = Opts::parse();

    let (message, proof) = opts.fetch_proof()?;
    let replica = opts.replica().await?;

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
