use std::time::Duration;

pub const APP: &str = "FormAT";
pub const SHELL_ENV: &str = "FORMAT_PARENT_PID";
pub const ADDRESS_WAIT: Duration = Duration::from_secs(90);
pub const KEY_WAIT: Duration = Duration::from_secs(10);
pub const BUSY_CODE: i32 = 2;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Wait {
    Address,
    Key,
}

impl Wait {
    pub fn limit(self) -> Duration {
        match self {
            Wait::Address => ADDRESS_WAIT,
            Wait::Key => KEY_WAIT,
        }
    }

    pub fn what(self) -> &'static str {
        match self {
            Wait::Address => "its engine to say which address it serves on",
            Wait::Key => "its engine to hand over the key for the window",
        }
    }
}

#[derive(Debug, PartialEq)]
pub enum Failure {
    Stopped(Option<i32>),
    TimedOut(Wait),
}

pub fn overdue(address_known: bool, since_start: Duration, since_address: Option<Duration>) -> Option<Wait> {
    if !address_known {
        return (since_start >= ADDRESS_WAIT).then_some(Wait::Address);
    }
    match since_address {
        Some(waited) if waited >= KEY_WAIT => Some(Wait::Key),
        _ => None,
    }
}

pub fn sentence(failure: &Failure) -> String {
    match failure {
        Failure::Stopped(Some(BUSY_CODE)) => format!("{APP} could not start: another copy of its engine holds its data folder."),
        Failure::Stopped(_) => format!("The {APP} engine failed to start. Please relaunch the app."),
        Failure::TimedOut(wait) => format!("{APP} could not start: it waited {} seconds for {} and that did not happen.", wait.limit().as_secs(), wait.what()),
    }
}

pub fn message(failure: &Failure, tail: &[String]) -> String {
    let mut text = sentence(failure);
    if !tail.is_empty() {
        text.push_str("\n\n");
        text.push_str(&tail.join("\n"));
    } else if matches!(failure, Failure::TimedOut(_)) {
        text.push_str("\n\nThe engine wrote nothing before that.");
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_wait_for_the_address_runs_out_after_its_limit_and_not_before() {
        assert_eq!(ADDRESS_WAIT, Duration::from_secs(90));
        assert_eq!(overdue(false, Duration::from_secs(89), None), None);
        assert_eq!(overdue(false, Duration::from_secs(90), None), Some(Wait::Address));
        assert_eq!(overdue(false, Duration::from_secs(400), Some(Duration::from_secs(1))), Some(Wait::Address));
    }

    #[test]
    fn once_the_address_is_known_only_the_wait_for_the_key_can_run_out() {
        assert_eq!(overdue(true, Duration::from_secs(400), Some(Duration::from_secs(9))), None);
        assert_eq!(overdue(true, Duration::from_secs(400), Some(Duration::from_secs(10))), Some(Wait::Key));
        assert_eq!(overdue(true, Duration::from_secs(400), None), None);
    }

    #[test]
    fn a_wait_that_runs_out_says_how_long_and_for_what() {
        assert_eq!(
            sentence(&Failure::TimedOut(Wait::Address)),
            "FormAT could not start: it waited 90 seconds for its engine to say which address it serves on and that did not happen."
        );
        assert!(sentence(&Failure::TimedOut(Wait::Key)).contains("waited 10 seconds for its engine to hand over the key for the window"));
        assert!(message(&Failure::TimedOut(Wait::Address), &[]).ends_with("The engine wrote nothing before that."));
    }

    #[test]
    fn a_stopped_engine_keeps_its_sentence_and_its_last_lines() {
        let said = vec!["FormAT is already running on the data folder /data (engine process 7).".to_string(), "engine exited (Some(2))".to_string()];
        let busy = message(&Failure::Stopped(Some(BUSY_CODE)), &said);
        assert!(busy.starts_with("FormAT could not start: another copy of its engine holds its data folder.\n\n"));
        assert!(busy.ends_with("(engine process 7).\nengine exited (Some(2))"));
        assert_eq!(sentence(&Failure::Stopped(Some(1))), "The FormAT engine failed to start. Please relaunch the app.");
        assert_eq!(message(&Failure::Stopped(None), &[]), "The FormAT engine failed to start. Please relaunch the app.");
    }
}
