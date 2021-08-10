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
    #[clap(short, long)]
    value: Option<U256>,
    #[clap(long)]
    nonce: Option<U256>,
    #[clap(long)]
    gas_price: Option<U256>,
    #[clap(long)]
    gas: Option<U256>,
    #[clap(short, long)]
    data: Option<String>,
    #[clap(short, long)]
    to: Address,

    // AWS
    #[clap(short, long)]
    key_id: String,
    #[clap(short, long)]
    region: String,

    // RPC
    #[clap(short, long)]
    rpc: String,

    // Behavior
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

    let signer = AwsSigner::new(KMS_CLIENT.get().unwrap(), opts.key_id.clone(), 0).await?;
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
