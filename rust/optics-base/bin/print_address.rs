use color_eyre::Result;

use ethers::signers::{AwsSigner, Signer};
use rusoto_core::{credential::EnvironmentProvider, Client, HttpClient};
use rusoto_kms::KmsClient;

async fn _main() -> Result<()> {
    let mut args = std::env::args();
    args.next();
    let region = args.next().expect("insufficient args. need region");
    let key_id = args.next().expect("insufficient args. need key_id");

    let client = Client::new_with(EnvironmentProvider::default(), HttpClient::new().unwrap());
    let kms_client = KmsClient::new_with_client(client, region.parse().expect("invalid region"));
    let signer = AwsSigner::new(&kms_client, key_id.clone(), 0).await?;

    println!("region\t{}", &region);
    println!("key_id\t{}", &key_id);
    println!("address\t{}", signer.address());

    Ok(())
}

fn main() -> Result<()> {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main())
}
