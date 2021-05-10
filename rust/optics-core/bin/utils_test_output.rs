#[cfg(feature = "output")]
use optics_core::test_output::output_functions::*;

fn main() {
    #[cfg(feature = "output")]
    {
        output_home_domain_hashes();
        output_destination_and_sequences();
    }
}
