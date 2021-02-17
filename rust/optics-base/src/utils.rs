pub(crate) fn destination_and_sequence(destination: u32, sequence: u32) -> u64 {
    ((destination as u64) << 32) & sequence as u64
}

// TODO: add test to ensure calculation matches Solidity
// calcdestinationAndSequence function
