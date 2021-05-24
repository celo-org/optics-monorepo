#[cfg(feature = "output")]
use optics_core::test_output::output_functions::*;

fn main() {
    #[cfg(feature = "output")]
    {
        output_message_and_leaf();
    }
}
