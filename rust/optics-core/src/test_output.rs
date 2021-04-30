use crate::{utils::home_domain_hash, FailureNotification, Update};
use ethers::core::types::H256;

use serde_json::{json, Value};
use std::{fs::OpenOptions, io::Write};

/// Test functions that output json files
#[cfg(feature = "output")]
pub mod output_functions {
    use super::*;

    /// Outputs domain hash test cases in /vector/domainHashTestCases.json
    pub fn output_home_domain_hashes() {
        let test_cases: Vec<Value> = (1..=3)
            .map(|i| {
                json!({
                    "homeDomain": i,
                    "expectedDomainHash": home_domain_hash(i)
                })
            })
            .collect();

        let json = json!({ "testCases": test_cases }).to_string();

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("../../vectors/domainHashTestCases.json")
            .expect("Failed to open/create file");

        file.write_all(json.as_bytes())
            .expect("Failed to write to file");
    }

    /// Outputs signed update test cases in /vector/signedUpdateTestCases.json
    pub fn output_signed_updates() {
        let t = async {
            let signer: ethers::signers::LocalWallet =
                "1111111111111111111111111111111111111111111111111111111111111111"
                    .parse()
                    .unwrap();

            let mut test_cases: Vec<Value> = Vec::new();

            // test suite
            for i in 1..=3 {
                let signed_update = Update {
                    home_domain: 1000,
                    new_root: H256::repeat_byte(i + 1),
                    previous_root: H256::repeat_byte(i),
                }
                .sign_with(&signer)
                .await
                .expect("!sign_with");

                test_cases.push(json!({
                    "homeDomain": signed_update.update.home_domain,
                    "oldRoot": signed_update.update.previous_root,
                    "newRoot": signed_update.update.new_root,
                    "signature": signed_update.signature,
                    "signer": signer.address(),
                }))
            }

            let json = json!({ "testCases": test_cases }).to_string();

            let mut file = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open("../../vectors/signedUpdateTestCases.json")
                .expect("Failed to open/create file");

            file.write_all(json.as_bytes())
                .expect("Failed to write to file");
        };

        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(t)
    }

    /// Outputs signed update test cases in /vector/signedFailureTestCases.json
    pub fn output_signed_failure_notifications() {
        let t = async {
            let signer: ethers::signers::LocalWallet =
                "1111111111111111111111111111111111111111111111111111111111111111"
                    .parse()
                    .unwrap();

            let updater: ethers::signers::LocalWallet =
                "2222222222222222222222222222222222222222222222222222222222222222"
                    .parse()
                    .unwrap();

            // `home_domain` MUST BE 2000 to match home_domain domain of
            // XAppConnectionManager test suite
            let signed_failure = FailureNotification {
                home_domain: 2000,
                updater: updater.address().into(),
            }
            .sign_with(&signer)
            .await
            .expect("!sign_with");

            let signed_json = json!({
                "domain": signed_failure.notification.home_domain,
                "updater": signed_failure.notification.updater.as_ethereum_address(),
                "signature": signed_failure.signature,
                "signer": signer.address()
            });

            let json = json!({ "testCases": vec!(signed_json) }).to_string();

            let mut file = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open("../../vectors/signedFailureTestCases.json")
                .expect("Failed to open/create file");

            file.write_all(json.as_bytes())
                .expect("Failed to write to file");
        };

        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(t)
    }
}
