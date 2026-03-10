use rusqlite::params;
use tauri::State;

use crate::commands::DbState;

#[tauri::command]
pub fn load_app_setting(key: String, state: State<'_, DbState>) -> Result<Option<String>, String> {
    let normalized_key = normalize_key(&key)?;
    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    let result = connection.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        params![normalized_key],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub fn save_app_setting(key: String, value: String, state: State<'_, DbState>) -> Result<(), String> {
    let normalized_key = normalize_key(&key)?;
    let normalized_value = value.trim().to_string();

    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    connection
        .execute(
            r#"
            INSERT INTO app_settings (key, value, updated_at)
            VALUES (?1, ?2, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP
            "#,
            params![normalized_key, normalized_value],
        )
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

    connection
        .execute("DELETE FROM app_settings WHERE key = ?1", params![normalized_key])
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
