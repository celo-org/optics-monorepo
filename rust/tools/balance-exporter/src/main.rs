use std::{path::PathBuf, time::Duration};

use clap::Arg;
use color_eyre::eyre::anyhow;
use futures::StreamExt;
use human_panic::setup_panic;
use optics_base::ChainSetup;
use tokio::time::Instant;

#[derive(serde::Deserialize, Debug)]
struct Input {
    contracts: Vec<ChainSetup>,
}

struct Sample {
    balances: Vec<color_eyre::Result<String>>,
}

async fn poll_once(input: &Input, timeout: Duration) -> Sample {
    // does this open a new ws connection for each query? probably.
    let (send, mut recv) = tokio::sync::mpsc::unbounded_channel();

    // moves `send` into the subtask executor. by the time it is complete,
    // `recv` will complete to exhaustion, due to `send` clones being dropped
    futures::stream::iter(
        input
            .contracts
            .iter()
            .enumerate()
            .zip(std::iter::repeat(send)),
    )
    .for_each_concurrent(None, |((ix, _cs), send)| async move {
        let sub_result =
            tokio::time::timeout(timeout, std::future::ready(Err(anyhow!("WIP")))).await;
        send.send((ix, sub_result))
            .expect("channel closed before we're done?");
    })
    .await;

    let mut balances: Vec<Option<color_eyre::Result<String>>> =
        input.contracts.iter().map(|_| None).collect();

    while let Some((ix, sub_result)) = recv.recv().await {
        match sub_result {
            Ok(Ok(v)) => balances[ix] = Some(Ok(v)),
            Ok(Err(e)) => balances[ix] = Some(Err(e)),
            Err(_) => balances[ix] = Some(Err(anyhow!("timeout expired"))),
        }
    }

    assert!(balances.iter().all(Option::is_some));

    Sample {
        balances: balances.into_iter().map(Option::unwrap).collect(),
    }
}

#[tokio::main]
async fn main() -> color_eyre::Result<()> {
    setup_panic!();
    color_eyre::install()?;

    let args = clap::app_from_crate!()
        .arg(
            Arg::new("polling-interval")
                .validator(|s| {
                    str::parse::<u64>(s).map_err(|_| anyhow!("polling interval must be u64!"))
                })
                .about("Minimum number of seconds to wait between poll attempts")
                .default_value("120"),
        )
        .arg(
            Arg::new("stdin")
                .about("Read configuration JSON from stdin")
                .required_unless_present("file"),
        )
        .arg(
            Arg::new("file")
                .takes_value(true)
                .about("Path to configuration JSON file"),
        )
        .get_matches();

    eprintln!("Hello, world!");

    eprintln!("You asked me to do this: {:?}", args);

    eprintln!("Loading up the input...");

    let setup: Input = if !args.is_present("stdin") {
        serde_json::from_reader(std::fs::File::open(PathBuf::from(
            args.value_of_os("file").expect("malformed --file"),
        ))?)?
    } else {
        serde_json::from_reader(std::io::stdin())?
    };

    let interval = Duration::from_secs(
        args.value_of_t("polling-interval")
            .expect("malformed --polling-interval"),
    );

    println!("Going to start exporting these:");
    setup.contracts.iter().for_each(|s| println!("\t {:?}", s));

    loop {
        let start = Instant::now();
        let results = poll_once(&setup, interval).await;

        for (ix, res) in results.balances.into_iter().enumerate() {
            let ChainSetup {
                name: network,
                address,
                ..
            } = &setup.contracts[ix];
            match res {
                Ok(s) => {
                    // TODO: export metric
                    println!("{} {} = {}", network, address, s);
                }
                Err(e) => {
                    eprintln!("Error while querying {:?}: {}", setup.contracts[ix], e);
                }
            }
        }

        tokio::time::sleep_until(start + interval).await;
    }
}

impl Sample {
    #[allow(dead_code)]
    fn record(_m: impl metrics::Recorder) {}
}

#[tokio::test]
#[should_panic]
async fn mainnet_works() {
    // query ethereum instance of XAppConnectionManager and asserts the balance is nonzero.
    let sample = poll_once(
        &Input {
            contracts: vec![ChainSetup {
                name: "ethereum".into(),
                domain: "6648936".into(),
                // i would love for this to just be ChainConf::ethereum()
                chain: optics_base::chains::ChainConf::Ethereum(optics_ethereum::Connection::Ws {
                    url: "wss://main-light.eth.linkpool.io/ws".into(),
                }),
                address: "0xcEc158A719d11005Bd9339865965bed938BEafA3".into(),
                disabled: None,
            }],
        },
        Duration::from_secs(120),
    )
    .await;
    let only_balance = sample.balances[0].as_ref();
    assert!(only_balance.expect("failed to query chain!") != "0");
}
