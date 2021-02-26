use ethers::core::types::H256;
use sha3::{Digest, Keccak256};

pub(crate) fn domain_hash(origin_domain_id: u32) -> H256 {
    H256::from_slice(
        Keccak256::new()
            .chain(origin_domain_id.to_be_bytes())
            .chain("OPTICS".as_bytes())
            .finalize()
            .as_slice(),
    )
}

#[cfg(test)]
mod test {
    use serde_json::{json, Value};

    use super::*;
    use std::{fs::{OpenOptions}, io::Write};

    // Outputs domain hash test cases in /vector/domainHashTestCases.json
    fn output_domain_hashes() {
        let test_cases: Vec<Value> = (1..=3)
            .map(|i| json!({
                "originDomain": i,
                "expectedDomainHash": domain_hash(i)
            }))
            .collect();

        let json = json!({
            "testCases": test_cases
        }).to_string();

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("../../vectors/domainHashTestCases.json")
            .expect("Failed to open/create file");

        file.write_all(json.as_bytes()).expect("Failed to write to file");
    }
}
