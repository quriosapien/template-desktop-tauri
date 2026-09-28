//! The Tauri shell. The UI in ../src talks to it only through the commands in
//! `commands/`; see src/api/native.api.ts for the other side.

mod commands;
mod error;
mod json_file;
mod menu;
mod window;

use commands::{
    app_info, secrets, settings,
    settings::{SettingsStore, apply_theme},
    shell, updates,
};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        // First: a second launch must hand over to the running instance before
        // anything else starts (and races it for the settings file).
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window(window::MAIN_WINDOW) {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        // Stdout + the OS log dir (e.g. ~/Library/Logs/<identifier>/ on macOS).
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        // Used from Rust only (shell.rs); the webview holds no opener permission.
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(updates::PendingUpdate::default())
        .setup(|app| {
            let identifier = app.config().identifier.clone();
            app.manage(secrets::Secrets::new(secrets::KeyringBackend::new(
                identifier,
            )));

            let store = SettingsStore::new(app.path().app_config_dir()?.join("settings.json"));
            let theme = store.load().theme;
            app.manage(store);

            app.set_menu(menu::build(app.handle())?)?;
            app.on_menu_event(menu::handle_event);

            window::create_main(app)?;
            apply_theme(app.handle(), theme);
            log::info!(
                "Started {} {}",
                app.package_info().name,
                app.package_info().version
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_info::app_info,
            secrets::secret_get,
            secrets::secret_set,
            secrets::secret_delete,
            settings::settings_get,
            settings::settings_set,
            updates::update_check,
            updates::update_install,
            shell::open_external,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Tauri application");
}
