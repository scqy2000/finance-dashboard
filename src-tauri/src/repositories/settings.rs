use rusqlite::{params, Connection, OptionalExtension};

pub fn load_setting(connection: &Connection, key: &str) -> Result<Option<String>, rusqlite::Error> {
    connection
        .query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .optional()
}

pub fn save_setting(
    connection: &Connection,
    key: &str,
    value: &str,
) -> Result<(), rusqlite::Error> {
    connection.execute(
        r#"
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (?1, ?2, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        "#,
        params![key, value],
    )?;

    Ok(())
}

pub fn clear_setting(connection: &Connection, key: &str) -> Result<(), rusqlite::Error> {
    connection.execute("DELETE FROM app_settings WHERE key = ?1", params![key])?;
    Ok(())
}
