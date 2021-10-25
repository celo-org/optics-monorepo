use std::convert::TryFrom;

use color_eyre::Result;

use ethers::{
    prelude::{transaction::eip2718::TypedTransaction, Address, TransactionRequest, U256},
    providers::{Http, Middleware, Provider},
    signers::{AwsSigner, Signer},
};
use once_cell::sync::OnceCell;
use rusoto_core::{credential::EnvironmentProvider, HttpClient};
use rusoto_kms::KmsClient;

use clap::Parser;

static KMS_CLIENT: OnceCell<KmsClient> = OnceCell::new();

fn init_kms(region: String) {
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

#[derive(Parser)]
pub struct Tx {
    // TX
    /// The TX value (in wei)
    #[clap(short, long)]
    value: Option<String>,
    /// The TX nonce (pulled from RPC if omitted)
    #[clap(long)]
    nonce: Option<U256>,
    /// The TX gas price (pulled from RPC if omitted)
    #[clap(long)]
    gas_price: Option<U256>,
    /// The TX gas limit (estimated from RPC if omitted)
    #[clap(long)]
    gas: Option<U256>,
    /// The TX data body (omit for simple sends)
    #[clap(short, long)]
    data: Option<String>,
    /// The recipient/contract address
    #[clap(short, long)]
    to: Address,
    /// The chain_id. see https://chainlist.org
    #[clap(short, long)]
    chain_id: Option<u64>,

    // RPC
    /// RPC connection details
    #[clap(long)]
    rpc: String,
}

#[derive(Parser)]
pub struct Info {}

#[derive(Parser)]
/// Subcommands
#[allow(clippy::large_enum_variant)]
pub enum SubCommands {
    /// Send a tx signed by the KMS key
    Transaction(Tx),
    /// Print the key info (region, id, address)
    Info(Info),
}

#[derive(Parser)]
#[clap(version = "0.1", author = "James Prestwich")]
pub struct Opts {
    #[clap(subcommand)]
    sub: SubCommands,

    // AWS
    /// AWS Key ID
    #[clap(short, long)]
    key_id: String,
    /// AWS Region string
    #[clap(long)]
    region: String,

    // Behavior
    /// Print the tx req and signature instead of broadcasting
    #[clap(short, long)]
    print_only: bool,
}

macro_rules! apply_if {
    ($tx_req:ident, $method:ident, $prop:expr) => {{
        if let Some(prop) = $prop {
            $tx_req.$method(prop)
        } else {
            $tx_req
        }
    }};

    ($tx_req:ident, $opts:ident.$prop:ident) => {{
        let prop = $opts.$prop;
        apply_if!($tx_req, $prop, prop)
    }};
}

fn prep_tx_request(opts: &Tx) -> TransactionRequest {
    let tx_req = TransactionRequest::default().to(opts.to);

    // These swallow parse errors
    let tx_req = apply_if!(
        tx_req,
        data,
        opts.data.clone().and_then(|data| hex::decode(&data).ok())
    );
    let tx_req = apply_if!(
        tx_req,
        value,
        opts.value
            .clone()
            .and_then(|value| U256::from_dec_str(&value).ok())
    );

    let tx_req = apply_if!(tx_req, opts.nonce);
    let tx_req = apply_if!(tx_req, opts.gas);

    let data = opts
        .data
        .clone()
        .and_then(|s| hex::decode(s).ok())
        .unwrap_or_default();

    let tx_req = tx_req.data(data);

    apply_if!(tx_req, opts.gas_price)
}

async fn _send_tx(signer: &AwsSigner<'_>, opts: &Opts) -> Result<()> {
    let tx: &Tx = match opts.sub {
        SubCommands::Transaction(ref tx) => tx,
        SubCommands::Info(_) => unreachable!(),
    };

    let provider = Provider::<Http>::try_from(tx.rpc.as_ref())?;

    let tx_req = prep_tx_request(tx);

    let mut typed_tx: TypedTransaction = tx_req.clone().into();
    typed_tx.set_from(signer.address());
    typed_tx.set_nonce(
        provider
            .get_transaction_count(signer.address(), None)
            .await?,
    );

    // TODO: remove this these ethers is fixed
    typed_tx.set_gas(21000);
    typed_tx.set_gas_price(20_000_000_000u64); // 20 gwei

    let sig = signer.sign_transaction(&typed_tx).await?;

    let rlp = typed_tx.rlp_signed(signer.chain_id(), &sig);
    println!(
        "Tx request details:\n{}",
        serde_json::to_string_pretty(&typed_tx)?
    );

    println!("\nSigned Tx:\n 0x{}", hex::encode(&rlp));
    if !opts.print_only {
        let res = provider.send_raw_transaction(rlp).await?;
        println!("Broadcast tx with hash {:?}", *res);
        println!("Awaiting confirmation. Ctrl+c to exit");
        dbg!(res.await?);
    }

    Ok(())
}

async fn _print_info(signer: &AwsSigner<'_>, opts: &Opts) -> Result<()> {
    println!("Key ID: {}", opts.key_id);
    println!("Region: {}", opts.region);
    println!("Address: {}", signer.address());

    Ok(())
}

async fn _main() -> Result<()> {
    let opts: Opts = Opts::parse();
    init_kms(opts.region.to_owned());
    let chain_id = match opts.sub {
        SubCommands::Transaction(ref tx) => tx.chain_id.unwrap_or(1),
        SubCommands::Info(_) => 1,
    };

    let signer = AwsSigner::new(KMS_CLIENT.get().unwrap(), opts.key_id.clone(), 0)
        .await?
        .with_chain_id(chain_id);

    match opts.sub {
        SubCommands::Transaction(_) => _send_tx(&signer, &opts).await,
        SubCommands::Info(_) => _print_info(&signer, &opts).await,
    }
}

fn main() -> Result<()> {
    color_eyre::install()?;

    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main())
}
