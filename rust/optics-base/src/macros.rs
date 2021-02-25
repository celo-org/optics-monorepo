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
