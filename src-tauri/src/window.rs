use tauri::{
    App, Runtime, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, webview::NewWindowResponse,
};
use tauri_plugin_opener::OpenerExt;

use crate::commands::shell::is_safe_external_url;

pub const MAIN_WINDOW: &str = "main";

/// The UI's own origins: the Vite dev server in debug builds, and the
/// bundled-assets origin in release builds (tauri://localhost on macOS/Linux,
/// http://tauri.localhost on Windows).
fn is_app_url(url: &Url, dev_url: Option<&Url>) -> bool {
    let same_origin = |other: &Url| url.origin() == other.origin();
    let bundled = url.scheme() == "tauri" || url.host_str() == Some("tauri.localhost");
    bundled || dev_url.is_some_and(same_origin)
}

/// Built in Rust (not tauri.conf.json) so the navigation guards can be attached.
pub fn create_main<R: Runtime>(app: &App<R>) -> tauri::Result<WebviewWindow<R>> {
    let dev_url = if cfg!(debug_assertions) {
        app.config().build.dev_url.clone()
    } else {
        None
    };
    let navigation_opener = app.handle().clone();
    let new_window_opener = app.handle().clone();

    WebviewWindowBuilder::new(app, MAIN_WINDOW, WebviewUrl::default())
        .title(app.package_info().name.clone())
        .inner_size(1100.0, 760.0)
        .min_inner_size(720.0, 520.0)
        // The UI never leaves its own origin (hash routing only changes the
        // fragment). Anything else is blocked; https links go to the browser.
        .on_navigation(move |url| {
            if is_app_url(url, dev_url.as_ref()) {
                return true;
            }
            if is_safe_external_url(url.as_str()) {
                let _ = navigation_opener
                    .opener()
                    .open_url(url.as_str(), None::<&str>);
            }
            false
        })
        // window.open / target="_blank": never a new webview window.
        .on_new_window(move |url, _features| {
            if is_safe_external_url(url.as_str()) {
                let _ = new_window_opener
                    .opener()
                    .open_url(url.as_str(), None::<&str>);
            }
            NewWindowResponse::Deny
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn url(value: &str) -> Url {
        Url::parse(value).unwrap()
    }

    #[test]
    fn allows_the_bundled_origins() {
        assert!(is_app_url(
            &url("tauri://localhost/index.html#/settings"),
            None
        ));
        assert!(is_app_url(&url("http://tauri.localhost/index.html"), None));
    }

    #[test]
    fn allows_the_dev_server_only_when_configured() {
        let dev = url("http://localhost:5173");
        assert!(is_app_url(
            &url("http://localhost:5173/#/login"),
            Some(&dev)
        ));
        assert!(!is_app_url(&url("http://localhost:5173/"), None));
        assert!(!is_app_url(&url("http://localhost:9999/"), Some(&dev)));
    }

    #[test]
    fn blocks_everything_else() {
        let dev = url("http://localhost:5173");
        for other in [
            "https://example.com",
            "file:///etc/passwd",
            "http://tauri.localhost.evil.com/",
        ] {
            assert!(!is_app_url(&url(other), Some(&dev)), "{other}");
        }
    }
}
