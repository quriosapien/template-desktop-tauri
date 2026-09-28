use tauri::State;

use crate::error::AppError;

const MAX_VALUE_LEN: usize = 16_384;

/// Where secrets live. The app uses the OS keychain; tests use a map.
pub trait SecretBackend: Send + Sync {
    fn get(&self, key: &str) -> Result<Option<String>, AppError>;
    fn set(&self, key: &str, value: &str) -> Result<(), AppError>;
    fn delete(&self, key: &str) -> Result<(), AppError>;
}

/// Managed state wrapping the active backend.
pub struct Secrets(Box<dyn SecretBackend>);

impl Secrets {
    pub fn new(backend: impl SecretBackend + 'static) -> Self {
        Self(Box::new(backend))
    }

    pub fn get(&self, key: &str) -> Result<Option<String>, AppError> {
        validate_key(key)?;
        self.0.get(key)
    }

    pub fn set(&self, key: &str, value: &str) -> Result<(), AppError> {
        validate_key(key)?;
        if value.len() > MAX_VALUE_LEN {
            return Err(AppError::InvalidInput("Secret value is too long.".into()));
        }
        self.0.set(key, value)
    }

    pub fn delete(&self, key: &str) -> Result<(), AppError> {
        validate_key(key)?;
        self.0.delete(key)
    }
}

/// Same rule as template-desktop-electron: `^[a-z0-9][a-z0-9._-]{0,63}$`, case-insensitive.
fn validate_key(key: &str) -> Result<(), AppError> {
    let mut chars = key.chars();
    let valid_first = chars.next().is_some_and(|c| c.is_ascii_alphanumeric());
    let valid_rest = chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'));
    if valid_first && valid_rest && key.len() <= 64 {
        Ok(())
    } else {
        Err(AppError::InvalidInput("Invalid secret key.".into()))
    }
}

/// The OS keychain: macOS Keychain, Windows Credential Manager, or the Secret
/// Service on Linux. One entry per key, under the app's identifier.
pub struct KeyringBackend {
    service: String,
}

impl KeyringBackend {
    pub fn new(service: impl Into<String>) -> Self {
        Self {
            service: service.into(),
        }
    }

    fn entry(&self, key: &str) -> Result<keyring::Entry, AppError> {
        keyring::Entry::new(&self.service, key).map_err(map_keyring_error)
    }
}

impl SecretBackend for KeyringBackend {
    fn get(&self, key: &str) -> Result<Option<String>, AppError> {
        match self.entry(key)?.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(map_keyring_error(error)),
        }
    }

    fn set(&self, key: &str, value: &str) -> Result<(), AppError> {
        self.entry(key)?
            .set_password(value)
            .map_err(map_keyring_error)
    }

    fn delete(&self, key: &str) -> Result<(), AppError> {
        match self.entry(key)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(map_keyring_error(error)),
        }
    }
}

/// No usable keychain is `unsupported` — the UI then keeps the session in
/// memory only (src/utils/token-storage.util.ts). Anything else is internal.
fn map_keyring_error(error: keyring::Error) -> AppError {
    match error {
        // NoDefaultStore: keyring found no platform store at startup (e.g. Linux
        // without a Secret Service daemon).
        keyring::Error::NoDefaultStore
        | keyring::Error::NoStorageAccess(_)
        | keyring::Error::PlatformFailure(_) => {
            log::warn!("keychain unavailable: {error}");
            AppError::Unsupported("OS keychain is unavailable.".into())
        }
        other => AppError::internal(format!("keychain error: {other}")),
    }
}

#[tauri::command]
pub async fn secret_get(
    secrets: State<'_, Secrets>,
    key: String,
) -> Result<Option<String>, AppError> {
    secrets.get(&key)
}

#[tauri::command]
pub async fn secret_set(
    secrets: State<'_, Secrets>,
    key: String,
    value: String,
) -> Result<(), AppError> {
    secrets.set(&key, &value)
}

#[tauri::command]
pub async fn secret_delete(secrets: State<'_, Secrets>, key: String) -> Result<(), AppError> {
    secrets.delete(&key)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{collections::HashMap, sync::Mutex};

    #[derive(Default)]
    struct MemoryBackend(Mutex<HashMap<String, String>>);

    impl SecretBackend for MemoryBackend {
        fn get(&self, key: &str) -> Result<Option<String>, AppError> {
            Ok(self.0.lock().unwrap().get(key).cloned())
        }
        fn set(&self, key: &str, value: &str) -> Result<(), AppError> {
            self.0.lock().unwrap().insert(key.into(), value.into());
            Ok(())
        }
        fn delete(&self, key: &str) -> Result<(), AppError> {
            self.0.lock().unwrap().remove(key);
            Ok(())
        }
    }

    #[test]
    fn round_trips_and_deletes() {
        let secrets = Secrets::new(MemoryBackend::default());

        secrets.set("refresh-token", "super-secret").unwrap();
        assert_eq!(
            secrets.get("refresh-token").unwrap().as_deref(),
            Some("super-secret")
        );

        secrets.delete("refresh-token").unwrap();
        assert_eq!(secrets.get("refresh-token").unwrap(), None);
    }

    #[test]
    fn validates_keys_before_touching_the_backend() {
        let secrets = Secrets::new(MemoryBackend::default());
        for bad in ["", "../escape", ".hidden", "has space", &"k".repeat(65)] {
            assert_eq!(
                secrets.get(bad).unwrap_err().kind(),
                "invalid-input",
                "{bad:?}"
            );
        }
        assert!(secrets.get("refresh-token.v2_ok").is_ok());
    }

    #[test]
    fn rejects_oversized_values() {
        let secrets = Secrets::new(MemoryBackend::default());
        let error = secrets
            .set("k", &"x".repeat(MAX_VALUE_LEN + 1))
            .unwrap_err();
        assert_eq!(error.kind(), "invalid-input");
    }

    #[test]
    fn a_missing_keychain_is_unsupported_not_internal() {
        let locked = keyring::Error::NoStorageAccess(Box::new(std::io::Error::other("locked")));
        assert_eq!(map_keyring_error(locked).kind(), "unsupported");
        assert_eq!(
            map_keyring_error(keyring::Error::NoDefaultStore).kind(),
            "unsupported"
        );
    }
}
