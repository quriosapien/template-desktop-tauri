use std::{fs, path::Path};

use serde::{Serialize, de::DeserializeOwned};

use crate::error::AppError;

/// Reads a JSON file, falling back to `T::default()` when it is missing,
/// unparseable or the wrong shape — a corrupt settings file must never brick
/// the app.
pub fn read_or_default<T: DeserializeOwned + Default>(path: &Path) -> T {
    fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

/// Write-to-temp-then-rename, so a crash mid-write leaves the old file intact.
/// Owner-only permissions on Unix: these files are the user's alone.
pub fn write_atomic<T: Serialize>(path: &Path, value: &T) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut json = serde_json::to_vec_pretty(value).map_err(AppError::internal)?;
    json.push(b'\n');

    let temp = path.with_extension(format!("tmp.{}", std::process::id()));
    fs::write(&temp, json)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&temp, fs::Permissions::from_mode(0o600))?;
    }
    fs::rename(&temp, path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;

    #[derive(Debug, Default, PartialEq, Serialize, Deserialize)]
    struct Data {
        count: u32,
    }

    #[test]
    fn falls_back_to_default_for_missing_corrupt_or_invalid_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("data.json");
        assert_eq!(read_or_default::<Data>(&path), Data::default());

        fs::write(&path, "not json").unwrap();
        assert_eq!(read_or_default::<Data>(&path), Data::default());

        fs::write(&path, r#"{"count":"three"}"#).unwrap();
        assert_eq!(read_or_default::<Data>(&path), Data::default());
    }

    #[test]
    fn writes_pretty_json_creating_parents_and_leaving_no_temp_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("data.json");

        write_atomic(&path, &Data { count: 3 }).unwrap();

        assert_eq!(read_or_default::<Data>(&path), Data { count: 3 });
        assert_eq!(fs::read_to_string(&path).unwrap(), "{\n  \"count\": 3\n}\n");
        let entries: Vec<_> = fs::read_dir(path.parent().unwrap()).unwrap().collect();
        assert_eq!(entries.len(), 1);
    }

    #[cfg(unix)]
    #[test]
    fn writes_owner_only_files() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("data.json");

        write_atomic(&path, &Data { count: 1 }).unwrap();

        assert_eq!(
            fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o600
        );
    }
}
