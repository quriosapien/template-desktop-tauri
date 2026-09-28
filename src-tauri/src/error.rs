use serde::{Serialize, Serializer, ser::SerializeStruct};

/// A failure reported to the UI. Serialises to `{ kind, message }`, the
/// `NativeErrorPayload` shape in src/types/native.types.ts — the same shape
/// template-desktop-electron's IPC layer produces.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Unsupported(String),
    #[error("{0}")]
    InvalidInput(String),
    #[error("{0}")]
    Forbidden(String),
    #[error("{0}")]
    Io(String),
    /// Details are logged, never sent: internals don't belong in the webview.
    #[error("Unexpected error — see the app log.")]
    Internal,
}

impl AppError {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Unsupported(_) => "unsupported",
            Self::InvalidInput(_) => "invalid-input",
            Self::Forbidden(_) => "forbidden",
            Self::Io(_) => "io",
            Self::Internal => "internal",
        }
    }

    /// Logs `detail` and returns the generic internal error.
    pub fn internal(detail: impl std::fmt::Display) -> Self {
        log::error!("{detail}");
        Self::Internal
    }
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        // The kind only: io::Error messages carry file paths.
        Self::Io(format!("File system error ({:?})", error.kind()))
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("kind", self.kind())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

/// First line only: some library errors embed whole HTTP responses.
pub fn first_line(message: &str) -> &str {
    message.lines().next().unwrap_or_default().trim()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn serialises_to_the_ui_payload_shape() {
        let cases = [
            (AppError::Unsupported("No keychain".into()), "unsupported"),
            (AppError::InvalidInput("Bad key".into()), "invalid-input"),
            (AppError::Forbidden("Nope".into()), "forbidden"),
            (AppError::Io("Disk".into()), "io"),
        ];
        for (error, kind) in cases {
            let message = error.to_string();
            assert_eq!(
                serde_json::to_value(&error).unwrap(),
                json!({ "kind": kind, "message": message })
            );
        }
    }

    #[test]
    fn internal_errors_hide_their_detail() {
        let error = AppError::internal("secret detail /Users/me/path");
        let value = serde_json::to_value(&error).unwrap();
        assert_eq!(value["kind"], "internal");
        assert!(!value.to_string().contains("/Users/me"));
    }

    #[test]
    fn io_errors_keep_the_kind_but_drop_paths() {
        let error: AppError =
            std::io::Error::new(std::io::ErrorKind::PermissionDenied, "open /Users/me/x").into();
        assert_eq!(error.to_string(), "File system error (PermissionDenied)");
    }

    #[test]
    fn first_line_trims_multi_line_messages() {
        assert_eq!(first_line("404 \nheaders: set-cookie=..."), "404");
        assert_eq!(first_line(""), "");
    }
}
