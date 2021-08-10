use std::convert::TryFrom;

use color_eyre::Result;

use ethers::{
    prelude::{Address, SignerMiddleware, TransactionRequest, U256},
    providers::{Http, Middleware, Provider},
    signers::{AwsSigner, Signer},
};
use once_cell::sync::OnceCell;
use rusoto_core::{credential::EnvironmentProvider, HttpClient};
use rusoto_kms::KmsClient;

use clap::Clap;

static KMS_CLIENT: OnceCell<KmsClient> = OnceCell::new();

fn init_kms(region: String) {
    // setup KMS
    let client =
        rusoto_core::Client::new_with(EnvironmentProvider::default(), HttpClient::new().unwrap());
    if KMS_CLIENT
        .set(KmsClient::new_with_client(
            client,
            region.parse().expect("invalid region"),
        ))
        .is_err()
    {
        panic!("couldn't set cell")
    }
}

#[derive(Clap)]
#[clap(version = "0.1", author = "James Prestwich")]
pub struct Opts {
    // TX
    /// The TX value
    #[clap(short, long)]
    value: Option<U256>,
    /// The TX nonce (pulled from RPC if omitted)
    #[clap(long)]
    nonce: Option<U256>,
    /// The TX gas price (pulled from RPC if omitted)
    #[clap(long)]
    gas_price: Option<U256>,
    /// The TX gas limit (estimated from RPC if omitted)
    #[clap(long)]
    gas: Option<U256>,
    /// The tx data body (omit for simple sends)
    #[clap(short, long)]
    data: Option<String>,
    /// The recipient/contract address
    #[clap(short, long)]
    to: Address,
    /// The chain_id. see https://chainlist.org
    #[clap(short, long)]
    chain_id: Option<u64>,

    // AWS
    /// AWS Key ID
    #[clap(short, long)]
    key_id: String,
    /// AWS Region string
    #[clap(long)]
    region: String,

    // RPC
    /// RPC connection details
    #[clap(long)]
    rpc: String,

    // Behavior
    /// Print the tx req and signature instead of broadcasting
    #[clap(short, long)]
    print_only: bool,
}

macro_rules! apply_if {
    ($tx_req:ident, $opts:ident, $prop:ident) => {{
        if let Some(prop) = $opts.$prop {
            $tx_req.$prop(prop)
        } else {
            $tx_req
        }
    }};
}

fn prep_tx_request(opts: &Opts) -> TransactionRequest {
    let tx_req = TransactionRequest::default().to(opts.to);
    let tx_req = apply_if!(tx_req, opts, value);
    let tx_req = apply_if!(tx_req, opts, nonce);
    let tx_req = apply_if!(tx_req, opts, gas);
    let tx_req = apply_if!(tx_req, opts, gas_price);

    match opts.data.clone().and_then(|data| hex::decode(&data).ok()) {
        Some(data) => tx_req.data(data),
        None => tx_req,
    }
}

async fn _main() -> Result<()> {
    let opts: Opts = Opts::parse();

    init_kms(opts.region.to_owned());

    let signer = AwsSigner::new(KMS_CLIENT.get().unwrap(), opts.key_id.clone(), 0)
        .await?
        .with_chain_id(opts.chain_id.unwrap_or(1));

    let provider = Provider::<Http>::try_from(opts.rpc.as_ref())?;
    let client = SignerMiddleware::new(provider, signer);

    let tx_req = prep_tx_request(&opts);

    if opts.print_only {
        let sig = client
            .signer()
            .sign_transaction(&tx_req.clone().into())
            .await?;
        dbg!(sig);
        dbg!(tx_req);
    } else {
        let res = client.send_transaction(tx_req, None).await?;
        dbg!(*res);
    }

    Ok(())
}

fn main() -> Result<()> {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main())
}
