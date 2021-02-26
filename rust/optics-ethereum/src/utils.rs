// Return destination and sequence
pub(crate) fn destination_and_sequence(destination: u32, sequence: u32) -> u64 {
    assert!(destination < u32::MAX);
    assert!(sequence < u32::MAX);
    ((destination as u64) << 32) | sequence as u64
}

#[cfg(test)]
mod test {
    use serde_json::{json, Value};

    use super::*;
    use std::{fs::{OpenOptions}, io::Write};

    // Outputs combined destination and sequence test cases in /vector/
    // destinationSequenceTestCases.json
    fn output_destination_and_sequences() {
        let test_cases: Vec<Value> = (1..=5)
            .map(|i| json!({
                "destination": i,
                "sequence": i + 1,
                "expectedDestinationAndSequence": destination_and_sequence(i, i + 1)
            }))
            .collect();

        let json = json!({
            "testCases": test_cases
        }).to_string();

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("../../vectors/destinationSequenceTestCases.json")
            .expect("Failed to open/create file");

        file.write_all(json.as_bytes()).expect("Failed to write to file");
    }
}