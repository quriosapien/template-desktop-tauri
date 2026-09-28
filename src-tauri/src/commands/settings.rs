use std::{path::PathBuf, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime, State};

use crate::{error::AppError, json_file};

/// Mirrors `Theme` in src/types/native.types.ts.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

impl Theme {
    /// `None` hands the choice back to the OS.
    pub fn native(self) -> Option<tauri::Theme> {
        match self {
            Self::System => None,
            Self::Light => Some(tauri::Theme::Light),
            Self::Dark => Some(tauri::Theme::Dark),
        }
    }
}

/// Mirrors `Settings`. `#[serde(default)]`: keys added in a later version fall
/// back to their defaults when an older file is read.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub theme: Theme,
}

/// Unknown keys are a caller bug, not something to persist.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SettingsPatch {
    theme: Option<Theme>,
}

/// JSON-file settings in the app config dir, updated one writer at a time.
pub struct SettingsStore {
    path: PathBuf,
    write_lock: Mutex<()>,
}

impl SettingsStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            write_lock: Mutex::new(()),
        }
    }

    pub fn load(&self) -> Settings {
        json_file::read_or_default(&self.path)
    }

    /// Validates a raw patch from the UI, merges it, and persists the result.
    pub fn apply(&self, patch: serde_json::Value) -> Result<Settings, AppError> {
        let patch: SettingsPatch = serde_json::from_value(patch)
            .map_err(|error| AppError::InvalidInput(format!("Invalid settings: {error}")))?;

        let _guard = self.write_lock.lock().map_err(AppError::internal)?;
        let mut settings = self.load();
        if let Some(theme) = patch.theme {
            settings.theme = theme;
        }
        json_file::write_atomic(&self.path, &settings)?;
        Ok(settings)
    }
}

/// The webview's prefers-color-scheme follows the window theme, so the UI's
/// Tailwind `dark:` variants need no JS.
pub fn apply_theme<R: Runtime>(app: &AppHandle<R>, theme: Theme) {
    for window in app.webview_windows().values() {
        if let Err(error) = window.set_theme(theme.native()) {
            log::warn!("could not apply theme: {error}");
        }
    }
}

#[tauri::command]
pub fn settings_get(store: State<'_, SettingsStore>) -> Settings {
    store.load()
}

#[tauri::command]
pub fn settings_set<R: Runtime>(
    app: AppHandle<R>,
    store: State<'_, SettingsStore>,
    patch: serde_json::Value,
) -> Result<Settings, AppError> {
    let settings = store.apply(patch)?;
    apply_theme(&app, settings.theme);
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn store() -> (tempfile::TempDir, SettingsStore) {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path().join("settings.json"));
        (dir, store)
    }

    #[test]
    fn defaults_before_anything_is_saved() {
        let (_dir, store) = store();
        assert_eq!(
            store.load(),
            Settings {
                theme: Theme::System
            }
        );
    }

    #[test]
    fn persists_a_patch_and_returns_the_merged_settings() {
        let (_dir, store) = store();

        let result = store.apply(json!({ "theme": "dark" })).unwrap();

        assert_eq!(result.theme, Theme::Dark);
        assert_eq!(store.load().theme, Theme::Dark);
    }

    #[test]
    fn rejects_invalid_values_and_unknown_keys_without_writing() {
        let (_dir, store) = store();

        for patch in [
            json!({ "theme": "neon" }),
            json!({ "theme": "dark", "extra": true }),
        ] {
            assert_eq!(store.apply(patch).unwrap_err().kind(), "invalid-input");
        }
        assert_eq!(store.load(), Settings::default());
    }

    #[test]
    fn serialises_the_way_the_ui_expects() {
        assert_eq!(
            serde_json::to_value(Settings {
                theme: Theme::Light
            })
            .unwrap(),
            json!({ "theme": "light" })
        );
    }

    #[test]
    fn system_theme_defers_to_the_os() {
        assert_eq!(Theme::System.native(), None);
        assert_eq!(Theme::Dark.native(), Some(tauri::Theme::Dark));
    }
}
