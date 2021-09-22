use std::{convert::TryFrom, sync::Arc};

use optics_core::{db::DB, traits::Replica, Decode, OpticsMessage};
use optics_ethereum::EthereumReplica;

use clap::Clap;
use ethers::{
    core::k256::ecdsa::SigningKey,
    prelude::{Http, Middleware, Provider, SignerMiddleware},
};

use color_eyre::Result;
use ethers_signers::{Signer, Wallet};

#[derive(Clap)]
struct Opts {
    /// Leaf index to prove
    #[clap(short, long)]
    leaf_index: u32,

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

#[tokio::main]
async fn main() -> Result<()> {
    let opts = Opts::parse();
    let provider = Provider::<Http>::try_from(opts.rpc.as_ref())?;
    let signer = opts
        .key
        .parse::<Wallet<SigningKey>>()?
        .with_chain_id(provider.get_chainid().await?.low_u64());

    let middleware = SignerMiddleware::new(provider, signer);

    let replica = EthereumReplica::new("", 0, opts.address.parse()?, Arc::new(middleware));

    let db = DB::from_path(&opts.db)?;

    let proof = db.proof_by_leaf_index(opts.leaf_index)?.expect("no proof");
    let message = db
        .message_by_leaf_index(opts.leaf_index)?
        .expect("no message");
    let message = OpticsMessage::read_from(&mut message.message.clone().as_slice())?;

    let outcome = replica.prove_and_process(&message, &proof).await?;

    println!("{:?}", outcome);

    Ok(())
}
