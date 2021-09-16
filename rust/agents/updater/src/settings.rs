//! Configuration
use optics_base::*;

decl_settings!(Updater {
    /// The updater attestation signer
    updater: optics_base::SignerConf,
    /// The polling interval (in seconds)
    interval: String,
    /// The delay (in seconds) before an updater will attempt to submit a
    /// signed update. This prevents accidental slashing due to reorgs on
    /// chains with slow or probabilistic finality
    pause: String,
});
