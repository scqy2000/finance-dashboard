use rusqlite::{Connection, Result};
use std::fs;
use tauri::{AppHandle, Manager};

// 当前 schema 版本号；每次新增迁移时递增。
const SCHEMA_VERSION: i64 = 2;

// Database structure mapping to JSON
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub r#type: String, // "asset" or "liability"
    pub currency: String,
    pub balance: f64,
    pub color: String,
    pub credit_limit: Option<f64>,
    pub statement_date: Option<i64>,
    pub due_date: Option<i64>,
    pub apr: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Transaction {
    pub id: String,
    pub account_id: String,
    pub amount: f64,
    pub category: String,
    pub description: Option<String>,
    pub date: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub r#type: String,
    pub emoji: String,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Installment {
    pub id: String,
    pub account_id: String,
    pub total_amount: f64,
    pub total_periods: i64,
    pub paid_periods: i64,
    pub monthly_payment: f64,
    pub interest_rate: f64,
    pub start_date: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct InstallmentPeriod {
    pub id: String,
    pub installment_id: String,
    pub period_number: i64,
    pub amount: f64,
    pub status: String,
    pub note: String,
    pub paid_at: Option<String>,
}

pub fn init_db(app: &AppHandle) -> Result<Connection> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

    let db_path = app_dir.join("finance-data.sqlite");
    println!("Initializing database at: {:?}", db_path);

    let conn = Connection::open(db_path)?;

    // Enable WAL for better concurrent performance
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;

    // Create tables
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            currency TEXT DEFAULT 'CNY',
            balance REAL DEFAULT 0,
            color TEXT DEFAULT '#4F46E5',
            credit_limit REAL,
            statement_date INTEGER,
            due_date INTEGER,
            apr REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL DEFAULT 'expense',
            emoji TEXT DEFAULT '💰',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS installments (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            total_amount REAL NOT NULL,
            total_periods INTEGER NOT NULL,
            paid_periods INTEGER DEFAULT 0,
            monthly_payment REAL NOT NULL,
            interest_rate REAL DEFAULT 0,
            start_date TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS installment_periods (
            id TEXT PRIMARY KEY,
            installment_id TEXT NOT NULL,
            period_number INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            note TEXT DEFAULT '',
            paid_at TEXT,
            FOREIGN KEY(installment_id) REFERENCES installments(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
        CREATE INDEX IF NOT EXISTS idx_installment_periods_inst_status ON installment_periods(installment_id, status, period_number);
        "#,
    )?;

    apply_migrations(&conn)?;

    // Seed default categories
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))?;
    if count == 0 {
        let default_cats = vec![
            ("exp_1", "餐饮美食", "expense", "🍔", 1),
            ("exp_2", "交通出行", "expense", "🚗", 2),
            ("exp_3", "日常购物", "expense", "🛒", 3),
            ("exp_4", "生活缴费", "expense", "💡", 4),
            ("exp_5", "休闲娱乐", "expense", "🎮", 5),
            ("exp_6", "医疗健康", "expense", "🏥", 6),
            ("exp_7", "教育学习", "expense", "📚", 7),
            ("exp_8", "其他支出", "expense", "💰", 8),
            ("inc_1", "工资收入", "income", "💼", 1),
            ("inc_2", "理财收益", "income", "📈", 2),
            ("inc_3", "兼职副业", "income", "🔧", 3),
            ("inc_4", "红包转账", "income", "🧧", 4),
            ("inc_5", "退款", "income", "↩️", 5),
            ("inc_6", "其他收入", "income", "💰", 6),
        ];

        let mut stmt = conn.prepare(
            "INSERT INTO categories (id, name, type, emoji, sort_order) VALUES (?, ?, ?, ?, ?)",
        )?;
        for c in default_cats {
            stmt.execute(rusqlite::params![c.0, c.1, c.2, c.3, c.4])?;
        }
    }

    Ok(conn)
}

fn apply_migrations(conn: &Connection) -> Result<()> {
    // 使用 SQLite 原生 user_version 做轻量迁移编排，避免依赖外部迁移框架。
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

fn migrate_to_v1(conn: &Connection) -> Result<()> {
    // v1 目标：补齐历史版本可能缺失的字段，并确保查询索引存在。
    ensure_column(
        conn,
        "accounts",
        "credit_limit",
        "ALTER TABLE accounts ADD COLUMN credit_limit REAL",
    )?;
    ensure_column(
        conn,
        "accounts",
        "statement_date",
        "ALTER TABLE accounts ADD COLUMN statement_date INTEGER",
    )?;
    ensure_column(
        conn,
        "accounts",
        "due_date",
        "ALTER TABLE accounts ADD COLUMN due_date INTEGER",
    )?;
    ensure_column(
        conn,
        "accounts",
        "apr",
        "ALTER TABLE accounts ADD COLUMN apr REAL",
    )?;

    conn.execute_batch(
        r#"
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
        CREATE INDEX IF NOT EXISTS idx_installment_periods_inst_status ON installment_periods(installment_id, status, period_number);
        "#,
    )?;

    Ok(())
}

fn migrate_to_v2(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )?;

    Ok(())
}

fn ensure_column(conn: &Connection, table: &str, column: &str, alter_sql: &str) -> Result<()> {
    // 先检查再 ALTER，避免重复执行导致初始化报错。
    if !has_column(conn, table, column)? {
        conn.execute(alter_sql, [])?;
    }

    Ok(())
}

fn has_column(conn: &Connection, table: &str, column: &str) -> Result<bool> {
    // PRAGMA table_info 返回当前表结构，按列名做不区分大小写匹配。
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
    let mut rows = stmt.query([])?;

    while let Some(row) = rows.next()? {
        let name: String = row.get("name")?;
        if name.eq_ignore_ascii_case(column) {
            return Ok(true);
        }
    }

    Ok(false)
}
