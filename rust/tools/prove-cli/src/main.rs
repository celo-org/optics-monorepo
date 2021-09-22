use std::{convert::TryFrom, sync::Arc};

use optics_core::{
    accumulator::merkle::Proof,
    db::DB,
    traits::{MessageStatus, Replica},
    Decode, OpticsMessage,
};
use optics_ethereum::EthereumReplica;

use clap::Clap;
use ethers::{
    core::k256::ecdsa::SigningKey,
    prelude::{Http, Middleware, Provider, SignerMiddleware},
    types::H256,
};

use color_eyre::{eyre::bail, Result};
use ethers_signers::{Signer, Wallet};

type ConcreteReplica = EthereumReplica<SignerMiddleware<Provider<Http>, Wallet<SigningKey>>>;

#[derive(Clap)]
struct Opts {
    /// Leaf index to prove
    #[clap(short, long)]
    leaf_index: Option<u32>,

    /// Leaf index to prove
    #[clap(short, long)]
    leaf_hash: Option<H256>,

    /// Path to db containing proof
    #[clap(long)]
    db: String,

    /// HexKey to use (please be careful)
    #[clap(long)]
    key: String,

    /// replica contract address
    #[clap(short, long)]
    address: String,

    /// RPC connection details
    #[clap(long)]
    rpc: String,
}

impl Opts {
    fn fetch_proof(&self) -> Result<(OpticsMessage, Proof)> {
        let db = DB::from_path(&self.db)?;

        let idx = if let Some(idx) = self.leaf_index {
            idx
        } else if let Some(leaf_hash) = self.leaf_hash {
            match db.message_by_leaf_hash(leaf_hash)? {
                Some(leaf) => leaf.leaf_index,
                None => bail!("No leaf index or "),
            }
        } else {
            bail!("Must provide leaf index or leaf hash");
        };

        let proof = db.proof_by_leaf_index(idx)?.expect("no proof");
        let message = db.message_by_leaf_index(idx)?.expect("no message");
        let message = OpticsMessage::read_from(&mut message.message.as_slice())?;

        Ok((message, proof))
    }

    async fn replica(&self) -> Result<ConcreteReplica> {
        let provider = Provider::<Http>::try_from(self.rpc.as_ref())?;
        let signer = self
            .key
            .parse::<Wallet<SigningKey>>()?
            .with_chain_id(provider.get_chainid().await?.low_u64());

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
