// Return destination and sequence
pub(crate) fn destination_and_sequence(destination: u32, sequence: u32) -> u64 {
    ((destination as u64) << 32) & sequence as u64
}

#[cfg(test)]
mod test {
    use serde_json::{json, Value};

    use super::*;
    use std::{fs::{OpenOptions}, io::Write};

    #[test]
    // Outputs combined destination and sequence test cases in /vector/
    // destinationSequenceTestCases.json
    fn output_destination_and_sequences() {
        let test_cases: Vec<Value> = (1..=5)
            .map(|i| json!({
                "destination": i * 100,
                "sequence": i * 500,
                "expectedDestinationAndSequence": destination_and_sequence(i * 100, i * 500)
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