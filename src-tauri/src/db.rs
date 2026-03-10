use rusqlite::{Connection, Result};
use std::fs;
use tauri::{AppHandle, Manager};

pub const SCHEMA_VERSION: i64 = 2;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct TemplateItem {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub total_steps: i64,
    pub completed_steps: i64,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct TemplateItemStep {
    pub id: String,
    pub item_id: String,
    pub title: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

pub fn init_db(app: &AppHandle) -> Result<Connection> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");

    fs::create_dir_all(&app_dir).expect("failed to create app data directory");

    let db_path = app_dir.join("template-data.sqlite");
    let conn = Connection::open(db_path)?;

    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;

    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS template_items (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS template_item_steps (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(item_id) REFERENCES template_items(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_template_items_status ON template_items(status);
        CREATE INDEX IF NOT EXISTS idx_template_items_updated_at ON template_items(updated_at DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_template_item_steps_item_status ON template_item_steps(item_id, status, updated_at DESC);
        "#,
    )?;

    apply_migrations(&conn)?;
    seed_example_data(&conn)?;

    Ok(conn)
}

fn apply_migrations(conn: &Connection) -> Result<()> {
    let current_version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if current_version < 1 {
        migrate_to_v1(conn)?;
    }

    if current_version < 2 {
        migrate_to_v2(conn)?;
    }

    conn.pragma_update(None, "user_version", SCHEMA_VERSION)?;
    Ok(())
}

fn migrate_to_v2(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS template_item_steps (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(item_id) REFERENCES template_items(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_template_item_steps_item_status ON template_item_steps(item_id, status, updated_at DESC);
        "#,
    )?;

    Ok(())
}

fn migrate_to_v1(conn: &Connection) -> Result<()> {
    ensure_column(
        conn,
        "template_items",
        "summary",
        "ALTER TABLE template_items ADD COLUMN summary TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column(
        conn,
        "template_items",
        "status",
        "ALTER TABLE template_items ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'",
    )?;
    ensure_column(
        conn,
        "template_items",
        "created_at",
        "ALTER TABLE template_items ADD COLUMN created_at TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column(
        conn,
        "template_items",
        "updated_at",
        "ALTER TABLE template_items ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''",
    )?;

    conn.execute_batch(
        r#"
        UPDATE template_items
        SET created_at = CASE WHEN created_at = '' THEN CURRENT_TIMESTAMP ELSE created_at END,
            updated_at = CASE WHEN updated_at = '' THEN CURRENT_TIMESTAMP ELSE updated_at END;

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_template_items_status ON template_items(status);
        CREATE INDEX IF NOT EXISTS idx_template_items_updated_at ON template_items(updated_at DESC, created_at DESC);
        "#,
    )?;

    Ok(())
}

fn ensure_column(conn: &Connection, table: &str, column: &str, statement: &str) -> Result<()> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let mut rows = stmt.query([])?;

    while let Some(row) = rows.next()? {
        let existing_column: String = row.get(1)?;
        if existing_column == column {
            return Ok(());
        }
    }

    conn.execute(statement, [])?;
    Ok(())
}

fn seed_example_data(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM template_items", [], |row| row.get(0))?;
    if count > 0 {
        seed_example_steps(conn)?;
        return Ok(());
    }

    conn.execute(
        r#"
        INSERT INTO template_items (id, title, summary, status)
        VALUES (?1, ?2, ?3, ?4)
        "#,
        (
            "welcome-template-item",
            "Start with one small example entity",
            "Replace this record shape with your own domain, but keep the page flow, state contract and write transaction pattern.",
            "active",
        ),
    )?;

    seed_example_steps(conn)?;

    Ok(())
}

fn seed_example_steps(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM template_item_steps", [], |row| {
        row.get(0)
    })?;
    if count > 0 {
        return Ok(());
    }

    conn.execute(
        r#"
        INSERT INTO template_item_steps (id, item_id, title, status)
        VALUES (?1, ?2, ?3, ?4), (?5, ?6, ?7, ?8)
        "#,
        (
            "welcome-step-1",
            "welcome-template-item",
            "Rename the template metadata",
            "done",
            "welcome-step-2",
            "welcome-template-item",
            "Replace the example entity with your own domain",
            "pending",
        ),
    )?;

    Ok(())
}
