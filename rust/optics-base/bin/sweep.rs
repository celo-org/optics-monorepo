use color_eyre::Result;

use ethers::{
    prelude::{Address, SignerMiddleware, TransactionRequest, U256},
    providers::{Http, Middleware, Provider},
    signers::{AwsSigner, Signer},
};
use once_cell::sync::OnceCell;
use rusoto_core::{credential::EnvironmentProvider, HttpClient};
use rusoto_kms::KmsClient;
use std::convert::TryFrom;

static KMS_CLIENT: OnceCell<KmsClient> = OnceCell::new();

async fn _main() -> Result<()> {
    let mut args = std::env::args();
    args.next();

    let region = args.next().expect("insufficient args. need region");
    let key_id = args.next().expect("insufficient args. need key_id");
    let rpc = args.next().expect("insufficient args. need rpc url");
    let destination: Address = args
        .next()
        .expect("insufficient args. need recipient address")
        .parse()
        .expect("invalid address");

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

    // setup ethers
    let signer = AwsSigner::<'_>::new(KMS_CLIENT.get().unwrap(), key_id.clone(), 0).await?;
    let address = signer.address();
    let provider = Provider::<Http>::try_from(rpc.as_ref())?;
    let client = SignerMiddleware::new(provider, signer);

    // estimate
    let tx_req = TransactionRequest::default().to(destination).value(100);
    let gas = U256::from(21000); // basic send tx gas req
    let gas_price = client.get_gas_price().await?;

    // get actual balance to send
    let balance = client.get_balance(address, None).await?;
    let to_send = balance - (gas * gas_price);

    let tx_req = tx_req.value(to_send).gas_price(gas_price).gas(gas);
    client.send_transaction(tx_req, None).await?;

    Ok(())
}

fn main() -> Result<()> {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main())
}
