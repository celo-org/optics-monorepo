pub(crate) fn destination_and_sequence(destination: u32, sequence: u32) -> u64 {
    return ((u64::from(destination)) << 32) & u64::from(sequence);
}

// TODO: add test to ensure calculation matches Solidity
// calcdestinationAndSequence function
