use tauri::{AppHandle, Runtime, Url};
use tauri_plugin_opener::OpenerExt;

use crate::error::AppError;

/// Only https links may leave the app for the system browser.
pub fn is_safe_external_url(url: &str) -> bool {
    Url::parse(url).is_ok_and(|parsed| parsed.scheme() == "https")
}

pub fn open_in_browser<R: Runtime>(app: &AppHandle<R>, url: &str) -> Result<(), AppError> {
    if !is_safe_external_url(url) {
        return Err(AppError::Forbidden(
            "Only https links can be opened.".into(),
        ));
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(AppError::internal)
}

#[tauri::command]
pub fn open_external<R: Runtime>(app: AppHandle<R>, url: String) -> Result<(), AppError> {
    open_in_browser(&app, &url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_https_only() {
        assert!(is_safe_external_url("https://example.com/path"));
        for unsafe_url in [
            "http://example.com",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "smb://x",
            "nope",
        ] {
            assert!(!is_safe_external_url(unsafe_url), "{unsafe_url}");
        }
    }
}
