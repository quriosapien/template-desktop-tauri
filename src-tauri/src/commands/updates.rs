use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Runtime, State};
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::error::{AppError, first_line};

/// Mirrors `UpdateCheck` in src/types/native.types.ts.
#[derive(Debug, PartialEq, Serialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum UpdateCheck {
    UpToDate,
    Available {
        version: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        notes: Option<String>,
    },
    Unsupported {
        reason: String,
    },
}

/// The update found by the last check, kept for `update_install`.
#[derive(Default)]
pub struct PendingUpdate(Mutex<Option<Update>>);

/// tauri-plugin-updater against the GitHub Releases `latest.json` configured in
/// tauri.conf.json. Signatures are verified with the configured public key.
#[tauri::command]
pub async fn update_check<R: Runtime>(
    app: AppHandle<R>,
    pending: State<'_, PendingUpdate>,
) -> Result<UpdateCheck, AppError> {
    if cfg!(debug_assertions) {
        return Ok(UpdateCheck::Unsupported {
            reason: "Updates only run in release builds.".into(),
        });
    }

    let updater = app
        .updater()
        .map_err(|error| AppError::Unsupported(error.to_string()))?;
    let update = updater.check().await.map_err(|error| {
        AppError::Io(format!(
            "Update check failed: {}",
            first_line(&error.to_string())
        ))
    })?;

    let result = match &update {
        Some(found) => UpdateCheck::Available {
            version: found.version.clone(),
            notes: found.body.clone(),
        },
        None => UpdateCheck::UpToDate,
    };
    *pending.0.lock().map_err(AppError::internal)? = update;
    Ok(result)
}

#[tauri::command]
pub async fn update_install<R: Runtime>(
    app: AppHandle<R>,
    pending: State<'_, PendingUpdate>,
) -> Result<(), AppError> {
    let update = pending
        .0
        .lock()
        .map_err(AppError::internal)?
        .take()
        .ok_or_else(|| AppError::InvalidInput("No update has been found to install.".into()))?;

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|error| {
            AppError::Io(format!(
                "Update install failed: {}",
                first_line(&error.to_string())
            ))
        })?;
    app.restart()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn serialises_the_way_the_ui_expects() {
        assert_eq!(
            serde_json::to_value(UpdateCheck::UpToDate).unwrap(),
            json!({ "status": "up-to-date" })
        );
        assert_eq!(
            serde_json::to_value(UpdateCheck::Available {
                version: "2.0.0".into(),
                notes: None
            })
            .unwrap(),
            json!({ "status": "available", "version": "2.0.0" })
        );
        assert_eq!(
            serde_json::to_value(UpdateCheck::Unsupported {
                reason: "dev".into()
            })
            .unwrap(),
            json!({ "status": "unsupported", "reason": "dev" })
        );
    }
}
