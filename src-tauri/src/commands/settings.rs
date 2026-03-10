use tauri::State;

use crate::commands::DbState;
use crate::repositories::settings as settings_repository;

#[tauri::command]
pub fn load_app_setting(key: String, state: State<'_, DbState>) -> Result<Option<String>, String> {
    let normalized_key = normalize_key(&key)?;
    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    settings_repository::load_setting(&connection, &normalized_key)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_app_setting(
    key: String,
    value: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let normalized_key = normalize_key(&key)?;
    let normalized_value = value.trim().to_string();

    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    settings_repository::save_setting(&connection, &normalized_key, &normalized_value)
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn clear_app_setting(key: String, state: State<'_, DbState>) -> Result<(), String> {
    let normalized_key = normalize_key(&key)?;
    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    settings_repository::clear_setting(&connection, &normalized_key)
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn normalize_key(value: &str) -> Result<String, String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err("setting key is required".to_string());
    }

    Ok(normalized.to_string())
}

#[cfg(test)]
mod tests {
    use super::normalize_key;

    #[test]
    fn setting_key_cannot_be_empty() {
        assert!(normalize_key(" ").is_err());
        assert_eq!(normalize_key(" template_key ").unwrap(), "template_key");
    }
}
