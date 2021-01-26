use ethers::core::types::{H256, U256};
use ethers::signers::LocalWallet;
use std::time::Duration;
use tokio::time::interval;

use optics_core::models::{home::Home, replica::Replica};

fn main() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(_main())
}

async fn _main() {
    let signer: LocalWallet = "1111111111111111111111111111111111111111111111111111111111111111"
        .parse()
        .unwrap();

    let updater = signer.address();

    let mut home = Home::init(1, updater);
    let mut replica = Replica::init(1, 2, updater, 1.into());

    let mut ticks = interval(Duration::from_secs(5));

    for i in 0u8..50 {
        // delay 5 seconds
        ticks.tick().await;
        println!("Enqueue 3 messages");
        home.enqueue(H256::repeat_byte(i), 2, H256::repeat_byte(i), &[]);
        home.enqueue(H256::repeat_byte(i), 2, H256::repeat_byte(i), &[]);
        home.enqueue(H256::repeat_byte(i), 2, H256::repeat_byte(i), &[]);

        let update = home.produce_update();
        let signed = update.sign_with(&signer).await.expect("!sign_with");
        println!("\tHome is at\t{}", &home.root());

        println!("Create update");
        println!("\tfrom\t\t{}", &update.previous_root);
        println!("\tto\t\t{}", &update.new_root);
        println!("Enqueue 1 message");
        home.enqueue(H256::repeat_byte(i), 2, H256::repeat_byte(i), &[]);
        println!("\tUpdate Home\t{}", &home.root());

        let now = || U256::from(i);
        let later = || U256::from(i + 100);

        println!("Submit replica Update");
        home.update(&signed).expect("!home.update");
        let pending = replica.update(&signed, now).expect("!replica.update");

        println!("\tReplica is at\t{}", &pending.root());

        println!("Confirm replica update");
        replica = pending
            .confirm_update(later)
            .expect("!replica.confirm_update");

        println!("\tUpdate Repl \t{}", &replica.root());
        println!("--------\n");
    }
}
