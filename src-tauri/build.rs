fn main() {
    // Declaring the app's commands here makes tauri-build generate one
    // `allow-<command>` permission per command. Nothing is callable from the
    // webview unless capabilities/default.json grants it.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "app_info",
            "secret_get",
            "secret_set",
            "secret_delete",
            "settings_get",
            "settings_set",
            "update_check",
            "update_install",
            "open_external",
        ]),
    ))
    .expect("failed to run tauri-build");
}
