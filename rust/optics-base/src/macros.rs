#[macro_export]
/// Shortcut for aborting a joinhandle and then awaiting and discarding its result
macro_rules! cancel_task {
    ($task:ident) => {
        #[allow(unused_must_use)]
        {
            let t = $task.into_inner();
            t.abort();
            t.await;
        }
    };
}

#[macro_export]
/// Shortcut for implementing agent traits
macro_rules! impl_as_ref_core {
    ($agent:ident) => {
        impl AsRef<optics_base::agent::AgentCore> for $agent {
            fn as_ref(&self) -> &optics_base::agent::AgentCore {
                &self.core
            }
        }
    };
}

#[macro_export]
/// Declare a new agent struct with the additional fields
macro_rules! decl_agent {
    (
        $(#[$outer:meta])*
        $name:ident{
            $($prop:ident: $type:ty,)*
        }) => {

        $(#[$outer])*
        #[derive(Debug)]
        pub struct $name {
            $($prop: $type,)*
            core: optics_base::agent::AgentCore,
        }

        $crate::impl_as_ref_core!($name);
    };
}

#[macro_export]
/// Declare a new settings block
///
/// This macro declares a settings struct for an agent. The new settings block
/// contains a [`crate::Settings`] and any other specified attributes.
///
/// Please note that integers must be specified as `String` in order to allow
/// them to be configured via env var. They must then be parsed in the
/// [`OpticsAgent::from_settings`](crate::agent::OpticsAgent::from_settings)
/// method.
///
/// ### Usage
///
/// ```ignore
/// decl_settings!(Updater {
///    updater: SignerConf,
///    polling_interval: String,
///    update_pause: String,
/// });
/// ```
macro_rules! decl_settings {
    (
        $name:ident {
            $($(#[$tags:meta])* $prop:ident: $type:ty,)*
        }
    ) => {
        paste::paste! {
            #[derive(Debug, serde::Deserialize)]
            #[serde(rename_all = "camelCase")]
            #[doc = "Settings for `" $name]
            pub struct [<$name Settings>] {
                #[serde(flatten)]
                pub(crate) base: optics_base::settings::Settings,
                $(
                    $(#[$tags])*
                    pub(crate) $prop: $type,
                )*
            }

            impl AsRef<optics_base::settings::Settings> for [<$name Settings>] {
                fn as_ref(&self) -> &optics_base::settings::Settings {
                    &self.base
                }
            }

            impl [<$name Settings>] {
                /// Read settings from the config files and/or env
                /// The config will be located at `config/default` unless specified
                /// otherwise
                ///
                /// Configs are loaded in the following precedence order:
                ///
                /// 1. The file specified by the `RUN_ENV` and `BASE_CONFIG`
                ///    env vars. `RUN_ENV/BASECONFIG`
                /// 2. The file specified by the `RUN_ENV` env var and the
                ///    agent's name. `RUN_ENV/AGENT-partial.json`
                /// 3. Configuration env vars with the prefix `OPT_BASE` intended
                ///    to be shared by multiple agents in the same environment
                /// 4. Configuration env vars with the prefix `OPT_AGENTNAME`
                ///    intended to be used by a specific agent.
                ///
                /// Specify a configuration directory with the `RUN_ENV` env
                /// variable. Specify a configuration file with the `BASE_CONFIG`
                /// env variable.
                pub fn new() -> Result<Self, config::ConfigError> {
                    let mut s = config::Config::new();

                    let env = std::env::var("RUN_ENV").unwrap_or_else(|_| "default".into());

                    let fname = std::env::var("BASE_CONFIG").unwrap_or_else(|_| "base".into());

                    s.merge(config::File::with_name(&format!("./config/{}/{}", env, fname)))?;
                    s.merge(config::File::with_name(&format!("./config/{}/{}-partial", env, stringify!($name).to_lowercase())).required(false))?;

                    // Use a base configuration env variable prefix
                    s.merge(config::Environment::with_prefix(&"OPT_BASE").separator("_"))?;

                    // Derive additional prefix from agent name
                    let prefix = format!("OPT_{}", stringify!($name).to_ascii_uppercase());
                    s.merge(config::Environment::with_prefix(&prefix).separator("_"))?;

                    s.try_into()
                }
            }
        }
    }
}
