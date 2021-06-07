use crate::{
    accumulator::{merkle::MerkleTree, TREE_DEPTH},
    utils::{destination_and_sequence, home_domain_hash},
    FailureNotification, OpticsMessage, Update,
};
use ethers::core::types::{H160, H256};
use hex::FromHex;

use serde_json::{json, Value};
use std::{fs::OpenOptions, io::Write};

/// Test functions that output json files
#[cfg(feature = "output")]
pub mod output_functions {
    use std::str::FromStr;

    use super::*;

    /// Output proof to /vector/messageTestCases.json
    pub fn output_message_and_leaf() {
        let optics_message = OpticsMessage {
            origin: 1000,
            sender: H256::from(
                H160::from_str("0x1111111111111111111111111111111111111111").unwrap(),
            ),
            sequence: 1,
            destination: 2000,
            recipient: H256::from(
                H160::from_str("0x2222222222222222222222222222222222222222").unwrap(),
            ),
            body: Vec::from_hex("1234").unwrap(),
        };

        let message_json = json!({
            "origin": optics_message.origin,
            "sender": optics_message.sender,
            "destination": optics_message.destination,
            "recipient": optics_message.recipient,
            "sequence": optics_message.sequence,
            "body": optics_message.body,
            "leaf": optics_message.to_leaf(),
        });
        let json = json!({ "testCases": [message_json] }).to_string();

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("../../vectors/messageTestCases.json")
            .expect("Failed to open/create file");

        file.write_all(json.as_bytes())
            .expect("Failed to write to file");
    }

    /// Output merkle proof test vectors
    pub fn output_merkle_proof() {
        let mut tree = MerkleTree::create(&[], TREE_DEPTH);

        let optics_message = OpticsMessage {
            origin: 1000,
            sender: H256::from(H160::from_str("0xd753c12650c280383Ce873Cc3a898F6f53973d16").unwrap()),
            destination: 2000,
            recipient: H256::from(H160::from_str("0xa779C1D17bC5230c07afdC51376CAC1cb3Dd5314").unwrap()),
            sequence: 1,
            body: Vec::from_hex("01010000000000000000000000006b39b761b1b64c8c095bf0e3bb0c6a74705b4788000000000000000000000000000000000000000000000000000000000000004499a88ec400000000000000000000000024432a08869578aaf4d1eada12e1e78f171b1a2b000000000000000000000000f66cfdf074d2ffd6a4037be3a669ed04380aef2b").unwrap(),
        };

        tree.push_leaf(optics_message.to_leaf(), TREE_DEPTH)
            .unwrap();
        let proof = tree.generate_proof(0, TREE_DEPTH);

        let proof_json = json!({ "leaf": proof.0, "path": proof.1 });
        let json = json!({ "proof": proof_json }).to_string();

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("../../vectors/proof.json")
            .expect("Failed to open/create file");

        file.write_all(json.as_bytes())
            .expect("Failed to write to file");
    }

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
            .open("../../vectors/homeDomainHashTestCases.json")
            .expect("Failed to open/create file");

        file.write_all(json.as_bytes())
            .expect("Failed to write to file");
    }

    /// Outputs combined destination and sequence test cases in /vector/
    /// destinationSequenceTestCases.json
    pub fn output_destination_and_sequences() {
        let test_cases: Vec<Value> = (1..=5)
            .map(|i| {
                json!({
                    "destination": i,
                    "sequence": i + 1,
                    "expectedDestinationAndSequence": destination_and_sequence(i, i + 1)
                })
            })
            .collect();

        let json = json!({ "testCases": test_cases }).to_string();

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("../../vectors/destinationSequenceTestCases.json")
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
