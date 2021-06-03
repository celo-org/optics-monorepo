#[macro_export]
/// Shortcut for resetting a timed loop
macro_rules! reset_loop {
    ($interval:ident) => {{
        $interval.tick().await;
        continue;
    }};
}

#[macro_export]
/// Shortcut for conditionally resetting a timed loop
macro_rules! reset_loop_if {
    ($condition:expr, $interval:ident) => {
        if $condition {
            $crate::reset_loop!($interval);
        }
    };
    ($condition:expr, $interval:ident, $($arg:tt)*) => {
        if $condition {
            tracing::info!($($arg)*);
            $crate::reset_loop!($interval);
        }
    };
}

#[macro_export]
/// Shortcut for aborting a joinhandle and then awaiting and discarding its result
macro_rules! cancel_task {
    ($task:ident) => {
        #[allow(unused_must_use)]
        {
            $task.abort();
            $task.await;
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
macro_rules! decl_settings {
    (
        $(#[$outer:meta])*
        Settings {
            agent: $name:literal,
            $($(#[$tags:meta])* $prop:ident: $type:ty,)*
        }
    ) => {

        $(#[$outer])*
        #[derive(Debug, serde::Deserialize)]
        #[serde(rename_all = "camelCase")]
        pub struct Settings {
            #[serde(flatten)]
            pub(crate) base: optics_base::settings::Settings,
            $(
                $(#[$tags])*
                pub(crate) $prop: $type,
            )*
        }

        impl AsRef<optics_base::settings::Settings> for Settings {
            fn as_ref(&self) -> &optics_base::settings::Settings {
                &self.base
            }
        }

        impl Settings {
            /// Read settings from the config file or env
            /// The config will be located at `config/default` unless specified
            /// otherwise
            pub fn new() -> Result<Self, config::ConfigError> {
                let mut s = config::Config::new();

                let env = std::env::var("RUN_ENV").unwrap_or_else(|_| "default".into());

                let fname = std::env::var("BASE_CONFIG").unwrap_or_else(|_| "base".into());

                s.merge(config::File::with_name(&format!("./config/{}/{}", env, fname)))?;
                s.merge(config::File::with_name(&format!("./config/{}/{}-partial", env, $name)).required(false))?;

                // Derive Environment prefix from agent name
                let prefix = format!("OPT_{}", $name.to_ascii_uppercase());
                s.merge(config::Environment::with_prefix(&prefix).separator("_"))?;

                s.try_into()
            }
        }

    }
}
