//! The app's IPC surface: every `#[tauri::command]` the UI can call. Each one
//! is listed in build.rs and granted in capabilities/default.json, and its
//! TypeScript side lives in src/api/native.api.ts.

pub mod app_info;
pub mod secrets;
pub mod settings;
pub mod shell;
pub mod updates;
