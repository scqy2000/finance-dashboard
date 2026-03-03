use crate::db::{Account, Category, Installment, InstallmentPeriod, Transaction};
use rusqlite::params;
use rusqlite::{Connection, OptionalExtension};
use std::sync::Mutex;
use tauri::Manager;
use tauri::State;

pub struct DbState(pub Mutex<Connection>);
const API_KEY_SETTING_KEY: &str = "finance_ai_api_key";
const API_KEY_CIPHER_KEY: &[u8] = b"finance-dashboard-local-key";

fn xor_cipher(input: &[u8]) -> Vec<u8> {
    input
        .iter()
        .enumerate()
        .map(|(idx, byte)| byte ^ API_KEY_CIPHER_KEY[idx % API_KEY_CIPHER_KEY.len()])
        .collect()
}

fn encode_hex(input: &[u8]) -> String {
    let mut out = String::with_capacity(input.len() * 2);
    for b in input {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

fn decode_hex(input: &str) -> Result<Vec<u8>, String> {
    if input.len() % 2 != 0 {
        return Err("加密数据长度非法".to_string());
    }

    let mut out = Vec::with_capacity(input.len() / 2);
    for chunk in input.as_bytes().chunks(2) {
        let hex = std::str::from_utf8(chunk).map_err(|e| e.to_string())?;
        let value = u8::from_str_radix(hex, 16).map_err(|e| e.to_string())?;
        out.push(value);
    }
    Ok(out)
}

fn encrypt_api_key(plain: &str) -> String {
    let cipher_bytes = xor_cipher(plain.as_bytes());
    encode_hex(&cipher_bytes)
}

fn decrypt_api_key(cipher_hex: &str) -> Result<String, String> {
    let cipher_bytes = decode_hex(cipher_hex)?;
    let plain_bytes = xor_cipher(&cipher_bytes);
    String::from_utf8(plain_bytes).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct TransactionPageResult {
    pub items: Vec<Transaction>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
    pub has_more: bool,
}

#[derive(serde::Serialize)]
pub struct FinanceSnapshot {
    pub total_assets: f64,
    pub total_debt: f64,
    pub net_worth: f64,
    pub period_income: f64,
    pub period_expense: f64,
    pub monthly_installment: f64,
    pub transaction_count: i64,
    pub account_count: i64,
    pub active_installments: i64,
    pub recent_transactions: Vec<Transaction>,
}

#[derive(serde::Serialize)]
pub struct CategoryTrendItem {
    pub category: String,
    pub emoji: String,
    pub r#type: String,
    pub total: f64,
    pub tx_count: i64,
}

#[derive(serde::Serialize)]
pub struct CategoryTrendSnapshot {
    pub expense: Vec<CategoryTrendItem>,
    pub income: Vec<CategoryTrendItem>,
}

// ==========================================
// Accounts
// ==========================================
#[tauri::command]
pub fn get_accounts(state: State<DbState>) -> Result<Vec<Account>, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM accounts")
        .map_err(|e| e.to_string())?;
    let accounts: Result<Vec<_>, _> = stmt
        .query_map([], |row| {
            Ok(Account {
                id: row.get("id")?,
                name: row.get("name")?,
                r#type: row.get("type")?,
                currency: row.get("currency")?,
                balance: row.get("balance")?,
                color: row.get("color")?,
                credit_limit: row.get("credit_limit")?,
                statement_date: row.get("statement_date")?,
                due_date: row.get("due_date")?,
                apr: row.get("apr")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect();
    accounts.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_account(id: String, state: State<DbState>) -> Result<Option<Account>, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM accounts WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let mut accounts = stmt
        .query_map(params![id], |row| {
            Ok(Account {
                id: row.get("id")?,
                name: row.get("name")?,
                r#type: row.get("type")?,
                currency: row.get("currency")?,
                balance: row.get("balance")?,
                color: row.get("color")?,
                credit_limit: row.get("credit_limit")?,
                statement_date: row.get("statement_date")?,
                due_date: row.get("due_date")?,
                apr: row.get("apr")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })
        .map_err(|e| e.to_string())?;

    if let Some(r) = accounts.next() {
        r.map(Some).map_err(|e| e.to_string())
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn create_account(mut account: Account, state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    account.id = format!(
        "acc_{}_{}",
        chrono::Utc::now().timestamp_millis(),
        uuid::Uuid::new_v4()
            .to_string()
            .chars()
            .take(4)
            .collect::<String>()
    );
    conn.execute(
        "INSERT INTO accounts (id, name, type, currency, balance, color, credit_limit, statement_date, due_date, apr) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            account.id, account.name, account.r#type, "CNY", account.balance, account.color,
            account.credit_limit, account.statement_date, account.due_date, account.apr
        ],
    ).map_err(|e| e.to_string())?;
    Ok(account.id)
}

#[tauri::command]
pub fn update_account(
    id: String,
    data: serde_json::Value,
    state: State<DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;

    let mut sets = Vec::new();
    let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut arg_idx = 1;

    let allowed_cols = [
        "name",
        "type",
        "currency",
        "balance",
        "color",
        "credit_limit",
        "statement_date",
        "due_date",
        "apr",
    ];
    let obj = data.as_object().ok_or("Invalid data")?;
    for (k, v) in obj {
        if !allowed_cols.contains(&k.as_str()) {
            continue;
        }
        sets.push(format!("{} = ?{}", k, arg_idx));
        arg_idx += 1;
        if v.is_null() {
            args.push(Box::new(rusqlite::types::Null));
        } else if let Some(s) = v.as_str() {
            args.push(Box::new(s.to_string()));
        } else if let Some(f) = v.as_f64() {
            args.push(Box::new(f));
        } else if let Some(i) = v.as_i64() {
            args.push(Box::new(i));
        } else if let Some(b) = v.as_bool() {
            args.push(Box::new(b));
        }
    }
    sets.push(format!("updated_at = ?{}", arg_idx));
    args.push(Box::new(
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    ));
    arg_idx += 1;
    args.push(Box::new(id.clone()));

    let sql = format!(
        "UPDATE accounts SET {} WHERE id = ?{}",
        sets.join(", "),
        arg_idx
    );

    // Annoying conversion for rusqlite params
    let mut dyn_args: Vec<&dyn rusqlite::ToSql> = Vec::new();
    for a in &args {
        dyn_args.push(&**a);
    }

    conn.execute(&sql, dyn_args.as_slice())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_account(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    conn.execute("DELETE FROM accounts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// Transactions
// ==========================================
#[tauri::command]
pub fn get_transactions(
    limit: Option<i32>,
    state: State<DbState>,
) -> Result<Vec<Transaction>, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;

    if let Some(valid_limit) = limit.filter(|v| *v > 0) {
        let mut stmt = conn
            .prepare("SELECT * FROM transactions ORDER BY date DESC LIMIT ?1")
            .map_err(|e| e.to_string())?;
        let records: Result<Vec<_>, _> = stmt
            .query_map(params![valid_limit], |row| {
                Ok(Transaction {
                    id: row.get("id")?,
                    account_id: row.get("account_id")?,
                    amount: row.get("amount")?,
                    category: row.get("category")?,
                    description: row.get("description")?,
                    date: row.get("date")?,
                    created_at: row.get("created_at")?,
                    updated_at: row.get("updated_at")?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect();
        return records.map_err(|e| e.to_string());
    }

    let mut stmt = conn
        .prepare("SELECT * FROM transactions ORDER BY date DESC")
        .map_err(|e| e.to_string())?;
    let records: Result<Vec<_>, _> = stmt
        .query_map([], |row| {
            Ok(Transaction {
                id: row.get("id")?,
                account_id: row.get("account_id")?,
                amount: row.get("amount")?,
                category: row.get("category")?,
                description: row.get("description")?,
                date: row.get("date")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect();
    records.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_transactions_page(
    page: Option<i64>,
    page_size: Option<i64>,
    query: Option<String>,
    account_id: Option<String>,
    category: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    min_amount: Option<f64>,
    max_amount: Option<f64>,
    tx_type: Option<String>,
    state: State<DbState>,
) -> Result<TransactionPageResult, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;

    let mut safe_page = page.unwrap_or(1).max(1);
    let safe_page_size = page_size.unwrap_or(50).clamp(1, 200);

    let search_like = query
        .map(|q| q.trim().to_lowercase())
        .filter(|q| !q.is_empty())
        .map(|q| format!("%{}%", q));

    let account_filter = account_id
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    let category_filter = category
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    let date_from_filter = date_from
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    let date_to_filter = date_to
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    let min_amount_filter = min_amount.filter(|v| v.is_finite() && *v >= 0.0);
    let max_amount_filter = max_amount.filter(|v| v.is_finite() && *v >= 0.0);
    let tx_type_filter = tx_type
        .map(|v| v.trim().to_lowercase())
        .and_then(|v| match v.as_str() {
            "income" => Some(v),
            "expense" => Some(v),
            _ => None,
        });

    let search_like_ref = search_like.as_deref();
    let account_filter_ref = account_filter.as_deref();
    let category_filter_ref = category_filter.as_deref();
    let date_from_filter_ref = date_from_filter.as_deref();
    let date_to_filter_ref = date_to_filter.as_deref();
    let tx_type_filter_ref = tx_type_filter.as_deref();

    let has_search = search_like_ref.is_some();
    let has_extra_filters = account_filter_ref.is_some()
        || category_filter_ref.is_some()
        || date_from_filter_ref.is_some()
        || date_to_filter_ref.is_some()
        || min_amount_filter.is_some()
        || max_amount_filter.is_some()
        || tx_type_filter_ref.is_some();

    let map_query =
        |sql: &str, params: &[&dyn rusqlite::ToSql]| -> Result<Vec<Transaction>, String> {
            let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
            let records: Result<Vec<_>, _> = stmt
                .query_map(params, |row| {
                    Ok(Transaction {
                        id: row.get("id")?,
                        account_id: row.get("account_id")?,
                        amount: row.get("amount")?,
                        category: row.get("category")?,
                        description: row.get("description")?,
                        date: row.get("date")?,
                        created_at: row.get("created_at")?,
                        updated_at: row.get("updated_at")?,
                    })
                })
                .map_err(|e| e.to_string())?
                .collect();
            records.map_err(|e| e.to_string())
        };

    let total: i64;
    let items: Vec<Transaction>;

    if !has_search && !has_extra_filters {
        total = conn
            .query_row("SELECT COUNT(*) FROM transactions", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
    } else if !has_search {
        total = conn
            .query_row(
                "SELECT COUNT(*) FROM transactions
                 WHERE (?1 IS NULL OR account_id = ?1)
                   AND (?2 IS NULL OR category = ?2)
                   AND (?3 IS NULL OR date >= ?3)
                   AND (?4 IS NULL OR date < ?4)
                   AND (?5 IS NULL OR ABS(amount) >= ?5)
                   AND (?6 IS NULL OR ABS(amount) <= ?6)
                   AND (?7 IS NULL OR ((?7 = 'income' AND amount > 0) OR (?7 = 'expense' AND amount < 0)))",
                params![
                    account_filter_ref,
                    category_filter_ref,
                    date_from_filter_ref,
                    date_to_filter_ref,
                    min_amount_filter,
                    max_amount_filter,
                    tx_type_filter_ref
                ],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
    } else {
        total = conn
            .query_row(
                "SELECT COUNT(*) FROM transactions
                 WHERE (?1 IS NULL
                   OR LOWER(COALESCE(description, '')) LIKE ?1
                   OR LOWER(category) LIKE ?1
                   OR CAST(amount AS TEXT) LIKE ?1
                   OR LOWER(date) LIKE ?1)
                   AND (?2 IS NULL OR account_id = ?2)
                   AND (?3 IS NULL OR category = ?3)
                   AND (?4 IS NULL OR date >= ?4)
                   AND (?5 IS NULL OR date < ?5)
                   AND (?6 IS NULL OR ABS(amount) >= ?6)
                   AND (?7 IS NULL OR ABS(amount) <= ?7)
                   AND (?8 IS NULL OR ((?8 = 'income' AND amount > 0) OR (?8 = 'expense' AND amount < 0)))",
                params![
                    search_like_ref,
                    account_filter_ref,
                    category_filter_ref,
                    date_from_filter_ref,
                    date_to_filter_ref,
                    min_amount_filter,
                    max_amount_filter,
                    tx_type_filter_ref
                ],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
    }

    let total_pages = if total == 0 {
        0
    } else {
        ((total + safe_page_size - 1) / safe_page_size).max(1)
    };

    if total_pages > 0 && safe_page > total_pages {
        safe_page = total_pages;
    }

    let offset = (safe_page - 1) * safe_page_size;

    if !has_search && !has_extra_filters {
        let page_size_ref: &dyn rusqlite::ToSql = &safe_page_size;
        let offset_ref: &dyn rusqlite::ToSql = &offset;
        items = map_query(
            "SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?1 OFFSET ?2",
            &[page_size_ref, offset_ref],
        )?;
    } else if !has_search {
        let account_ref: &dyn rusqlite::ToSql = &account_filter_ref;
        let category_ref: &dyn rusqlite::ToSql = &category_filter_ref;
        let date_from_ref: &dyn rusqlite::ToSql = &date_from_filter_ref;
        let date_to_ref: &dyn rusqlite::ToSql = &date_to_filter_ref;
        let min_ref: &dyn rusqlite::ToSql = &min_amount_filter;
        let max_ref: &dyn rusqlite::ToSql = &max_amount_filter;
        let tx_type_ref: &dyn rusqlite::ToSql = &tx_type_filter_ref;
        let page_size_ref: &dyn rusqlite::ToSql = &safe_page_size;
        let offset_ref: &dyn rusqlite::ToSql = &offset;

        items = map_query(
            "SELECT * FROM transactions
             WHERE (?1 IS NULL OR account_id = ?1)
               AND (?2 IS NULL OR category = ?2)
               AND (?3 IS NULL OR date >= ?3)
               AND (?4 IS NULL OR date < ?4)
               AND (?5 IS NULL OR ABS(amount) >= ?5)
               AND (?6 IS NULL OR ABS(amount) <= ?6)
               AND (?7 IS NULL OR ((?7 = 'income' AND amount > 0) OR (?7 = 'expense' AND amount < 0)))
             ORDER BY date DESC, created_at DESC
             LIMIT ?8 OFFSET ?9",
            &[
                account_ref,
                category_ref,
                date_from_ref,
                date_to_ref,
                min_ref,
                max_ref,
                tx_type_ref,
                page_size_ref,
                offset_ref,
            ],
        )?;
    } else {
        let search_ref: &dyn rusqlite::ToSql = &search_like_ref;
        let account_ref: &dyn rusqlite::ToSql = &account_filter_ref;
        let category_ref: &dyn rusqlite::ToSql = &category_filter_ref;
        let date_from_ref: &dyn rusqlite::ToSql = &date_from_filter_ref;
        let date_to_ref: &dyn rusqlite::ToSql = &date_to_filter_ref;
        let min_ref: &dyn rusqlite::ToSql = &min_amount_filter;
        let max_ref: &dyn rusqlite::ToSql = &max_amount_filter;
        let tx_type_ref: &dyn rusqlite::ToSql = &tx_type_filter_ref;
        let page_size_ref: &dyn rusqlite::ToSql = &safe_page_size;
        let offset_ref: &dyn rusqlite::ToSql = &offset;

        items = map_query(
            "SELECT * FROM transactions
             WHERE (?1 IS NULL
               OR LOWER(COALESCE(description, '')) LIKE ?1
               OR LOWER(category) LIKE ?1
               OR CAST(amount AS TEXT) LIKE ?1
               OR LOWER(date) LIKE ?1)
               AND (?2 IS NULL OR account_id = ?2)
               AND (?3 IS NULL OR category = ?3)
               AND (?4 IS NULL OR date >= ?4)
               AND (?5 IS NULL OR date < ?5)
               AND (?6 IS NULL OR ABS(amount) >= ?6)
               AND (?7 IS NULL OR ABS(amount) <= ?7)
               AND (?8 IS NULL OR ((?8 = 'income' AND amount > 0) OR (?8 = 'expense' AND amount < 0)))
             ORDER BY date DESC, created_at DESC
             LIMIT ?9 OFFSET ?10",
            &[
                search_ref,
                account_ref,
                category_ref,
                date_from_ref,
                date_to_ref,
                min_ref,
                max_ref,
                tx_type_ref,
                page_size_ref,
                offset_ref,
            ],
        )?;
    }

    Ok(TransactionPageResult {
        has_more: safe_page < total_pages,
        items,
        page: safe_page,
        page_size: safe_page_size,
        total,
        total_pages,
    })
}

#[tauri::command]
pub fn get_finance_snapshot(
    period_start: Option<String>,
    period_end: Option<String>,
    recent_limit: Option<i64>,
    state: State<DbState>,
) -> Result<FinanceSnapshot, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;

    let safe_recent_limit = recent_limit.unwrap_or(5).clamp(0, 50);

    let (total_assets, total_debt): (f64, f64) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(CASE WHEN type = 'asset' THEN balance ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN type = 'liability' THEN ABS(balance) ELSE 0 END), 0)
             FROM accounts",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let (period_income, period_expense): (f64, f64) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0)
             FROM transactions
             WHERE (?1 IS NULL OR date >= ?1)
               AND (?2 IS NULL OR date < ?2)",
            params![period_start, period_end],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let (monthly_installment, active_installments): (f64, i64) = conn
        .query_row(
            "SELECT COALESCE(SUM(monthly_payment), 0), COUNT(*)
             FROM installments
             WHERE status = 'active'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let transaction_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM transactions", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let account_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM accounts", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let recent_transactions = if safe_recent_limit == 0 {
        Vec::new()
    } else {
        let mut recent_stmt = conn
            .prepare("SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?1")
            .map_err(|e| e.to_string())?;

        let records: Result<Vec<_>, _> = recent_stmt
            .query_map(params![safe_recent_limit], |row| {
                Ok(Transaction {
                    id: row.get("id")?,
                    account_id: row.get("account_id")?,
                    amount: row.get("amount")?,
                    category: row.get("category")?,
                    description: row.get("description")?,
                    date: row.get("date")?,
                    created_at: row.get("created_at")?,
                    updated_at: row.get("updated_at")?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect();

        records.map_err(|e| e.to_string())?
    };

    Ok(FinanceSnapshot {
        account_count,
        active_installments,
        monthly_installment,
        net_worth: total_assets - total_debt,
        period_expense,
        period_income,
        recent_transactions,
        total_assets,
        total_debt,
        transaction_count,
    })
}

#[tauri::command]
pub fn get_category_trend(
    period_start: Option<String>,
    period_end: Option<String>,
    limit: Option<i64>,
    state: State<DbState>,
) -> Result<CategoryTrendSnapshot, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let safe_limit = limit.unwrap_or(6).clamp(1, 20);

    let mut expense_stmt = conn
        .prepare(
            "SELECT
                t.category,
                COALESCE(MAX(c.emoji), '💰') AS emoji,
                COALESCE(MAX(c.type), 'expense') AS type,
                COALESCE(SUM(-t.amount), 0) AS total,
                COUNT(*) AS tx_count
             FROM transactions t
             LEFT JOIN categories c ON c.name = t.category
             WHERE t.amount < 0
               AND (?1 IS NULL OR t.date >= ?1)
               AND (?2 IS NULL OR t.date < ?2)
             GROUP BY t.category
             ORDER BY total DESC
             LIMIT ?3",
        )
        .map_err(|e| e.to_string())?;

    let expense: Result<Vec<_>, _> = expense_stmt
        .query_map(
            params![period_start.clone(), period_end.clone(), safe_limit],
            |row| {
                Ok(CategoryTrendItem {
                    category: row.get("category")?,
                    emoji: row.get("emoji")?,
                    r#type: row.get("type")?,
                    total: row.get("total")?,
                    tx_count: row.get("tx_count")?,
                })
            },
        )
        .map_err(|e| e.to_string())?
        .collect();

    let mut income_stmt = conn
        .prepare(
            "SELECT
                t.category,
                COALESCE(MAX(c.emoji), '💼') AS emoji,
                COALESCE(MAX(c.type), 'income') AS type,
                COALESCE(SUM(t.amount), 0) AS total,
                COUNT(*) AS tx_count
             FROM transactions t
             LEFT JOIN categories c ON c.name = t.category
             WHERE t.amount > 0
               AND (?1 IS NULL OR t.date >= ?1)
               AND (?2 IS NULL OR t.date < ?2)
             GROUP BY t.category
             ORDER BY total DESC
             LIMIT ?3",
        )
        .map_err(|e| e.to_string())?;

    let income: Result<Vec<_>, _> = income_stmt
        .query_map(params![period_start, period_end, safe_limit], |row| {
            Ok(CategoryTrendItem {
                category: row.get("category")?,
                emoji: row.get("emoji")?,
                r#type: row.get("type")?,
                total: row.get("total")?,
                tx_count: row.get("tx_count")?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect();

    Ok(CategoryTrendSnapshot {
        expense: expense.map_err(|e| e.to_string())?,
        income: income.map_err(|e| e.to_string())?,
    })
}

#[tauri::command]
pub fn create_transaction(mut tx: Transaction, state: State<DbState>) -> Result<String, String> {
    let mut conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    tx.id = format!(
        "tx_{}_{}",
        chrono::Utc::now().timestamp_millis(),
        uuid::Uuid::new_v4()
            .to_string()
            .chars()
            .take(4)
            .collect::<String>()
    );

    let tx_scope = conn.transaction().map_err(|e| e.to_string())?;
    tx_scope
        .execute(
            "INSERT INTO transactions (id, account_id, amount, category, description, date) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![tx.id, tx.account_id, tx.amount, tx.category, tx.description, tx.date],
        )
        .map_err(|e| e.to_string())?;

    tx_scope
        .execute(
            "UPDATE accounts SET balance = balance + ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![tx.amount, tx.account_id],
        )
        .map_err(|e| e.to_string())?;

    tx_scope.commit().map_err(|e| e.to_string())?;
    Ok(tx.id)
}

#[tauri::command]
pub fn update_transaction(
    id: String,
    old_tx: Transaction,
    new_data: serde_json::Value,
    state: State<DbState>,
) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;

    let tx_scope = conn.transaction().map_err(|e| e.to_string())?;
    // 前端传入的是 Partial 更新，这里动态拼接 SQL 以支持“按需更新字段”。
    let mut sets = Vec::new();
    let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut arg_idx = 1;

    let allowed_cols = ["account_id", "amount", "category", "description", "date"];
    let obj = new_data.as_object().ok_or("Invalid data")?;
    for (k, v) in obj {
        if !allowed_cols.contains(&k.as_str()) {
            continue;
        }
        sets.push(format!("{} = ?{}", k, arg_idx));
        arg_idx += 1;
        if v.is_null() {
            args.push(Box::new(rusqlite::types::Null));
        } else if let Some(s) = v.as_str() {
            args.push(Box::new(s.to_string()));
        } else if let Some(f) = v.as_f64() {
            args.push(Box::new(f));
        } else if let Some(i) = v.as_i64() {
            args.push(Box::new(i));
        }
    }

    sets.push(format!("updated_at = ?{}", arg_idx));
    args.push(Box::new(
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    ));
    arg_idx += 1;
    args.push(Box::new(id.clone()));

    let sql = format!(
        "UPDATE transactions SET {} WHERE id = ?{}",
        sets.join(", "),
        arg_idx
    );

    // rusqlite 需要 &dyn ToSql，先在 Box 中持有值再转引用，避免临时值生命周期问题。
    let mut dyn_args: Vec<&dyn rusqlite::ToSql> = Vec::new();
    for a in &args {
        dyn_args.push(&**a);
    }

    tx_scope
        .execute(&sql, dyn_args.as_slice())
        .map_err(|e| e.to_string())?;

    let new_acc_id = obj
        .get("account_id")
        .and_then(|v| v.as_str())
        .unwrap_or(&old_tx.account_id);
    let new_amt = obj
        .get("amount")
        .and_then(|v| v.as_f64())
        .unwrap_or(old_tx.amount);

    // 余额修正规则：
    // 1) 同账户修改金额 -> 只补差额
    // 2) 跨账户修改 -> 原账户回滚旧金额，新账户追加新金额
    if old_tx.account_id == new_acc_id {
        let diff = new_amt - old_tx.amount;
        if diff != 0.0 {
            tx_scope
                .execute(
                    "UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
                    params![diff, old_tx.account_id],
                )
                .map_err(|e| e.to_string())?;
        }
    } else {
        tx_scope
            .execute(
                "UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
                params![old_tx.amount, old_tx.account_id],
            )
            .map_err(|e| e.to_string())?;
        tx_scope
            .execute(
                "UPDATE accounts SET balance = balance + ?1 WHERE id = ?2",
                params![new_amt, new_acc_id],
            )
            .map_err(|e| e.to_string())?;
    }

    tx_scope.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_transaction(tx: Transaction, state: State<DbState>) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let tx_scope = conn.transaction().map_err(|e| e.to_string())?;

    tx_scope
        .execute("DELETE FROM transactions WHERE id = ?1", params![tx.id])
        .map_err(|e| e.to_string())?;
    tx_scope
        .execute(
            "UPDATE accounts SET balance = balance - ?1 WHERE id = ?2",
            params![tx.amount, tx.account_id],
        )
        .map_err(|e| e.to_string())?;

    tx_scope.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// Categories
// ==========================================
#[tauri::command]
pub fn get_categories(state: State<DbState>) -> Result<Vec<Category>, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM categories ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let records: Result<Vec<_>, _> = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get("id")?,
                name: row.get("name")?,
                r#type: row.get("type")?,
                emoji: row.get("emoji")?,
                sort_order: row.get("sort_order")?,
                created_at: row.get("created_at")?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect();
    records.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_category(mut cat: Category, state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    cat.id = format!(
        "cat_{}_{}",
        chrono::Utc::now().timestamp_millis(),
        uuid::Uuid::new_v4()
            .to_string()
            .chars()
            .take(4)
            .collect::<String>()
    );
    conn.execute(
        "INSERT INTO categories (id, name, type, emoji, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![cat.id, cat.name, cat.r#type, cat.emoji, cat.sort_order],
    )
    .map_err(|e| e.to_string())?;
    Ok(cat.id)
}

#[tauri::command]
pub fn update_category(
    id: String,
    data: serde_json::Value,
    state: State<DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let mut sets = Vec::new();
    let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut arg_idx = 1;

    let allowed_cols = ["name", "type", "emoji", "sort_order"];
    let obj = data.as_object().ok_or("Invalid data")?;
    for (k, v) in obj {
        if !allowed_cols.contains(&k.as_str()) {
            continue;
        }
        sets.push(format!("{} = ?{}", k, arg_idx));
        arg_idx += 1;
        if let Some(s) = v.as_str() {
            args.push(Box::new(s.to_string()));
        } else if let Some(i) = v.as_i64() {
            args.push(Box::new(i));
        }
    }
    args.push(Box::new(id.clone()));

    let sql = format!(
        "UPDATE categories SET {} WHERE id = ?{}",
        sets.join(", "),
        arg_idx
    );
    let mut dyn_args: Vec<&dyn rusqlite::ToSql> = Vec::new();
    for a in &args {
        dyn_args.push(&**a);
    }
    conn.execute(&sql, dyn_args.as_slice())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_category(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// Installments
// ==========================================
#[tauri::command]
pub fn get_installments(state: State<DbState>) -> Result<Vec<Installment>, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM installments")
        .map_err(|e| e.to_string())?;
    let records: Result<Vec<_>, _> = stmt
        .query_map([], |row| {
            Ok(Installment {
                id: row.get("id")?,
                account_id: row.get("account_id")?,
                total_amount: row.get("total_amount")?,
                total_periods: row.get("total_periods")?,
                paid_periods: row.get("paid_periods")?,
                monthly_payment: row.get("monthly_payment")?,
                interest_rate: row.get("interest_rate")?,
                start_date: row.get("start_date")?,
                description: row.get("description")?,
                status: row.get("status")?,
                created_at: row.get("created_at")?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect();
    records.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_installments_by_account(
    account_id: String,
    state: State<DbState>,
) -> Result<Vec<Installment>, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM installments WHERE account_id = ?1")
        .map_err(|e| e.to_string())?;
    let records: Result<Vec<_>, _> = stmt
        .query_map(params![account_id], |row| {
            Ok(Installment {
                id: row.get("id")?,
                account_id: row.get("account_id")?,
                total_amount: row.get("total_amount")?,
                total_periods: row.get("total_periods")?,
                paid_periods: row.get("paid_periods")?,
                monthly_payment: row.get("monthly_payment")?,
                interest_rate: row.get("interest_rate")?,
                start_date: row.get("start_date")?,
                description: row.get("description")?,
                status: row.get("status")?,
                created_at: row.get("created_at")?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect();
    records.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_installment(
    mut inst: Installment,
    period_amounts: Option<Vec<f64>>,
    already_paid: i64,
    state: State<DbState>,
) -> Result<String, String> {
    let mut conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    inst.id = format!("inst_{}", chrono::Utc::now().timestamp_millis());

    if already_paid < 0 || already_paid >= inst.total_periods {
        return Err("已还期数不合法".to_string());
    }

    if let Some(ref pa) = period_amounts {
        if pa.len() != inst.total_periods as usize {
            return Err("自定义分期金额数量与总期数不一致".to_string());
        }
    }

    // monthly_payment 在“自定义每期金额”模式下，存储为“剩余待还平均值”，
    // 便于列表视图快速展示下一阶段的月供水平。
    let stored_monthly_payment = if let Some(ref pa) = period_amounts {
        let start = already_paid as usize;
        let remaining = &pa[start..];
        if remaining.is_empty() {
            0.0
        } else {
            remaining.iter().sum::<f64>() / remaining.len() as f64
        }
    } else {
        inst.monthly_payment
    };

    let tx_scope = conn.transaction().map_err(|e| e.to_string())?;
    tx_scope
        .execute(
            "INSERT INTO installments (id, account_id, total_amount, total_periods, paid_periods, monthly_payment, interest_rate, start_date, description, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
             params![inst.id, inst.account_id, inst.total_amount, inst.total_periods, already_paid, stored_monthly_payment, inst.interest_rate, inst.start_date, inst.description, "active"]
             )
        .map_err(|e| e.to_string())?;

    let periods = inst.total_periods;
    for i in 0..periods {
        let amt = if let Some(ref pa) = period_amounts {
            pa[i as usize]
        } else {
            inst.monthly_payment
        };
        let is_paid = i < already_paid;
        let status = if is_paid { "paid" } else { "pending" };
        let paid_at = if is_paid {
            Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
        } else {
            None
        };
        let pid = format!("{}_p{}", inst.id, i + 1);
        tx_scope
            .execute(
                "INSERT INTO installment_periods (id, installment_id, period_number, amount, status, paid_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![pid, inst.id, i+1, amt, status, paid_at]
            )
            .map_err(|e| e.to_string())?;
    }

    tx_scope.commit().map_err(|e| e.to_string())?;
    Ok(inst.id)
}

#[tauri::command]
pub fn get_periods(
    installment_id: String,
    state: State<DbState>,
) -> Result<Vec<InstallmentPeriod>, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT * FROM installment_periods WHERE installment_id = ?1 ORDER BY period_number",
        )
        .map_err(|e| e.to_string())?;
    let records: Result<Vec<_>, _> = stmt
        .query_map(params![installment_id], |row| {
            Ok(InstallmentPeriod {
                id: row.get("id")?,
                installment_id: row.get("installment_id")?,
                period_number: row.get("period_number")?,
                amount: row.get("amount")?,
                status: row.get("status")?,
                note: row.get("note")?,
                paid_at: row.get("paid_at")?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect();
    records.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pay_period(id: String, state: State<DbState>) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let tx_scope = conn.transaction().map_err(|e| e.to_string())?;

    // 只允许按期次顺序还款：始终取最早一条 pending。
    let next_period_id: Option<String> = tx_scope
        .query_row(
            "SELECT id FROM installment_periods WHERE installment_id = ?1 AND status = 'pending' ORDER BY period_number LIMIT 1",
            params![&id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let pid = match next_period_id {
        Some(pid) => pid,
        None => return Err("没有待还期数".into()),
    };

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    tx_scope
        .execute(
            "UPDATE installment_periods SET status = 'paid', paid_at = ?1 WHERE id = ?2",
            params![now, pid],
        )
        .map_err(|e| e.to_string())?;

    let (period_amount, inst_account_id, period_number, inst_desc): (f64, String, i64, Option<String>) =
        tx_scope
            .query_row(
                "SELECT ip.amount, i.account_id, ip.period_number, i.description FROM installment_periods ip JOIN installments i ON ip.installment_id = i.id WHERE ip.id = ?1",
                params![pid],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|e| e.to_string())?;

    let tx_id = format!(
        "txp_{}_{}",
        chrono::Utc::now().timestamp_millis(),
        uuid::Uuid::new_v4()
            .to_string()
            .chars()
            .take(4)
            .collect::<String>()
    );
    let tx_date = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let tx_desc = inst_desc
        .map(|d| format!("{} 第{}期还款", d, period_number))
        .unwrap_or_else(|| format!("分期第{}期还款", period_number));

    // 记一期还款时，补写一条负向流水，确保账本和分期明细一致。
    tx_scope
        .execute(
            "INSERT INTO transactions (id, account_id, amount, category, description, date) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![tx_id, inst_account_id, -period_amount, "分期还款", tx_desc, tx_date],
        )
        .map_err(|e| e.to_string())?;

    tx_scope
        .execute(
            "UPDATE accounts SET balance = balance - ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![period_amount, inst_account_id],
        )
        .map_err(|e| e.to_string())?;

    tx_scope
        .execute(
            "UPDATE installments SET paid_periods = paid_periods + 1 WHERE id = ?1",
            params![&id],
        )
        .map_err(|e| e.to_string())?;

    // 重新计算剩余期数的平均月供，避免最后几期与初始月供不一致。
    let (remaining_sum, remaining_count): (Option<f64>, i64) = tx_scope
        .query_row(
            "SELECT SUM(amount), COUNT(*) FROM installment_periods WHERE installment_id = ?1 AND status = 'pending'",
            params![&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;
    let next_monthly_payment = if remaining_count > 0 {
        remaining_sum.unwrap_or(0.0) / remaining_count as f64
    } else {
        0.0
    };

    tx_scope
        .execute(
            "UPDATE installments SET monthly_payment = ?1 WHERE id = ?2",
            params![next_monthly_payment, &id],
        )
        .map_err(|e| e.to_string())?;

    let (total, paid): (i64, i64) = tx_scope
        .query_row(
            "SELECT total_periods, paid_periods FROM installments WHERE id = ?1",
            params![&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;
    if paid >= total {
        tx_scope
            .execute(
                "UPDATE installments SET status = 'completed' WHERE id = ?1",
                params![&id],
            )
            .map_err(|e| e.to_string())?;
    }

    tx_scope.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn cancel_installment(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    conn.execute(
        "UPDATE installments SET status = 'cancelled' WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_api_key(state: State<DbState>) -> Result<Option<String>, String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let encrypted: Option<String> = conn
        .query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            params![API_KEY_SETTING_KEY],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    match encrypted {
        Some(cipher_hex) => decrypt_api_key(&cipher_hex).map(Some),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn save_api_key(api_key: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    let trimmed = api_key.trim();

    if trimmed.is_empty() {
        conn.execute(
            "DELETE FROM app_settings WHERE key = ?1",
            params![API_KEY_SETTING_KEY],
        )
        .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let encrypted = encrypt_api_key(trimmed);
    conn.execute(
        "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        params![API_KEY_SETTING_KEY, encrypted],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn clear_api_key(state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "数据库锁异常".to_string())?;
    conn.execute(
        "DELETE FROM app_settings WHERE key = ?1",
        params![API_KEY_SETTING_KEY],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// App Methods (Updates)
// ==========================================
#[tauri::command]
pub fn get_app_info(app_handle: tauri::AppHandle) -> serde_json::Value {
    let version = app_handle.package_info().version.to_string();
    let user_data = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    serde_json::json!({
        "version": version,
        "userData": user_data,
        "isPackaged": true, // In Tauri this usually indicates release mode
    })
}
