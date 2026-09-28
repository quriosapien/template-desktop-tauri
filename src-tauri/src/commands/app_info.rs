use serde::Serialize;
use tauri::{AppHandle, Runtime};

/// Mirrors `AppInfo` in src/types/native.types.ts.
#[derive(Debug, PartialEq, Serialize)]
pub struct AppInfo {
    name: String,
    version: String,
    platform: String,
    arch: String,
    homepage: String,
}

/// Node-style platform ids, so the UI sees the same values under both shells.
fn node_platform(os: &str) -> &str {
    match os {
        "macos" => "darwin",
        "windows" => "win32",
        other => other,
    }
}

fn node_arch(arch: &str) -> &str {
    match arch {
        "aarch64" => "arm64",
        "x86_64" => "x64",
        "x86" => "ia32",
        other => other,
    }
}

#[tauri::command]
pub fn app_info<R: Runtime>(app: AppHandle<R>) -> AppInfo {
    let package = app.package_info();
    AppInfo {
        name: package.name.clone(),
        version: package.version.to_string(),
        platform: node_platform(std::env::consts::OS).into(),
        arch: node_arch(std::env::consts::ARCH).into(),
        homepage: env!("CARGO_PKG_HOMEPAGE").into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_rust_platform_and_arch_names_to_node_ones() {
        assert_eq!(node_platform("macos"), "darwin");
        assert_eq!(node_platform("windows"), "win32");
        assert_eq!(node_platform("linux"), "linux");
        assert_eq!(node_arch("aarch64"), "arm64");
        assert_eq!(node_arch("x86_64"), "x64");
        assert_eq!(node_arch("riscv64"), "riscv64");
    }

    #[test]
    fn homepage_comes_from_cargo_toml_and_is_https() {
        assert!(env!("CARGO_PKG_HOMEPAGE").starts_with("https://"));
    }
}
