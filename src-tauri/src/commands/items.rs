use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::commands::DbState;
use crate::db::TemplateItem;

const DEFAULT_PAGE_SIZE: i64 = 12;
const MAX_PAGE_SIZE: i64 = 100;

#[derive(Deserialize)]
pub struct CreateTemplateItemInput {
    pub title: String,
    pub summary: String,
    pub status: String,
}

#[derive(Deserialize)]
pub struct UpdateTemplateItemInput {
    pub title: Option<String>,
    pub summary: Option<String>,
    pub status: Option<String>,
}

#[derive(Serialize)]
pub struct TemplateOverview {
    pub total_items: i64,
    pub active_items: i64,
    pub archived_items: i64,
    pub draft_items: i64,
}

#[derive(Serialize)]
pub struct TemplateItemPage {
    pub items: Vec<TemplateItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
    pub has_more: bool,
}

#[tauri::command]
pub fn get_template_items(limit: Option<i64>, state: State<'_, DbState>) -> Result<Vec<TemplateItem>, String> {
    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    let normalized_limit = limit.unwrap_or(100).clamp(1, MAX_PAGE_SIZE);
    let mut statement = connection
        .prepare(
            r#"
            SELECT id, title, summary, status, created_at, updated_at
            FROM template_items
            ORDER BY updated_at DESC, created_at DESC
            LIMIT ?1
            "#,
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![normalized_limit], map_template_item)
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_template_items_page(
    page: Option<i64>,
    page_size: Option<i64>,
    query: Option<String>,
    status: Option<String>,
    state: State<'_, DbState>,
) -> Result<TemplateItemPage, String> {
    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    let normalized_page = page.unwrap_or(1).max(1);
    let normalized_page_size = page_size.unwrap_or(DEFAULT_PAGE_SIZE).clamp(1, MAX_PAGE_SIZE);
    let normalized_query = normalize_optional_string(query);
    let normalized_status = normalize_optional_status(status)?;
    let offset = (normalized_page - 1) * normalized_page_size;

    let total: i64 = connection
        .query_row(
            r#"
            SELECT COUNT(*)
            FROM template_items
            WHERE (?1 IS NULL OR title LIKE '%' || ?1 || '%' OR summary LIKE '%' || ?1 || '%')
              AND (?2 IS NULL OR status = ?2)
            "#,
            params![normalized_query.clone(), normalized_status.clone()],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    let mut statement = connection
        .prepare(
            r#"
            SELECT id, title, summary, status, created_at, updated_at
            FROM template_items
            WHERE (?1 IS NULL OR title LIKE '%' || ?1 || '%' OR summary LIKE '%' || ?1 || '%')
              AND (?2 IS NULL OR status = ?2)
            ORDER BY updated_at DESC, created_at DESC
            LIMIT ?3 OFFSET ?4
            "#,
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(
            params![
                normalized_query,
                normalized_status,
                normalized_page_size,
                offset
            ],
            map_template_item,
        )
        .map_err(|error| error.to_string())?;

    let items = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    let total_pages = if total == 0 {
        1
    } else {
        (total + normalized_page_size - 1) / normalized_page_size
    };

    Ok(TemplateItemPage {
        has_more: normalized_page < total_pages,
        items,
        page: normalized_page,
        page_size: normalized_page_size,
        total,
        total_pages,
    })
}

#[tauri::command]
pub fn create_template_item(
    item: CreateTemplateItemInput,
    state: State<'_, DbState>,
) -> Result<TemplateItem, String> {
    let mut connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    let id = Uuid::new_v4().to_string();
    let title = normalize_title(&item.title)?;
    let summary = item.summary.trim().to_string();
    let status = normalize_status(Some(item.status.as_str()))?;

    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    transaction
        .execute(
            r#"
            INSERT INTO template_items (id, title, summary, status, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            "#,
            params![id, title, summary, status],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;

    fetch_item_by_id(&connection, &id)
}

#[tauri::command]
pub fn update_template_item(
    id: String,
    data: UpdateTemplateItemInput,
    state: State<'_, DbState>,
) -> Result<TemplateItem, String> {
    let mut connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let current = fetch_item_by_id(&transaction, &id)?;

    let title = match data.title.as_deref() {
        Some(value) => normalize_title(value)?,
        None => current.title.clone(),
    };
    let summary = data
        .summary
        .map(|value| value.trim().to_string())
        .unwrap_or(current.summary.clone());
    let status = match data.status.as_deref() {
        Some(value) => normalize_status(Some(value))?,
        None => current.status.clone(),
    };

    transaction
        .execute(
            r#"
            UPDATE template_items
            SET title = ?2,
                summary = ?3,
                status = ?4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?1
            "#,
            params![id, title, summary, status],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;

    fetch_item_by_id(&connection, &id)
}

#[tauri::command]
pub fn delete_template_item(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let mut connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    fetch_item_by_id(&transaction, &id)?;

    let affected_rows = transaction
        .execute("DELETE FROM template_items WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;

    if affected_rows == 0 {
        return Err("item not found".to_string());
    }

    transaction.commit().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_template_overview(state: State<'_, DbState>) -> Result<TemplateOverview, String> {
    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    connection
        .query_row(
            r#"
            SELECT
                COUNT(*) AS total_items,
                COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active_items,
                COALESCE(SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END), 0) AS archived_items,
                COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) AS draft_items
            FROM template_items
            "#,
            [],
            |row| {
                Ok(TemplateOverview {
                    total_items: row.get(0)?,
                    active_items: row.get(1)?,
                    archived_items: row.get(2)?,
                    draft_items: row.get(3)?,
                })
            },
        )
        .map_err(|error| error.to_string())
}

fn fetch_item_by_id(connection: &Connection, id: &str) -> Result<TemplateItem, String> {
    connection
        .query_row(
            r#"
            SELECT id, title, summary, status, created_at, updated_at
            FROM template_items
            WHERE id = ?1
            "#,
            params![id],
            map_template_item,
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => "item not found".to_string(),
            other => other.to_string(),
        })
}

fn map_template_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<TemplateItem> {
    Ok(TemplateItem {
        id: row.get(0)?,
        title: row.get(1)?,
        summary: row.get(2)?,
        status: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn normalize_title(value: &str) -> Result<String, String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err("title is required".to_string());
    }

    Ok(normalized.to_string())
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let normalized = item.trim().to_string();
        if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        }
    })
}

fn normalize_optional_status(value: Option<String>) -> Result<Option<String>, String> {
    match value {
        Some(status) => Ok(Some(normalize_status(Some(status.trim()))?)),
        None => Ok(None),
    }
}

fn normalize_status(value: Option<&str>) -> Result<String, String> {
    match value.map(str::trim) {
        Some("draft") => Ok("draft".to_string()),
        Some("active") => Ok("active".to_string()),
        Some("archived") => Ok("archived".to_string()),
        Some(_) => Err("invalid status".to_string()),
        None => Ok("draft".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::{normalize_status, normalize_title};

    #[test]
    fn status_normalization_rejects_invalid_values() {
        assert_eq!(normalize_status(Some("active")).unwrap(), "active");
        assert!(normalize_status(Some("unknown")).is_err());
    }

    #[test]
    fn title_normalization_requires_content() {
        assert!(normalize_title("   ").is_err());
        assert_eq!(normalize_title("  Sample  ").unwrap(), "Sample");
    }
}
