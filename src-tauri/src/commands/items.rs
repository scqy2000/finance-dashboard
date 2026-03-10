use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::DbState;
use crate::db::{TemplateItem, TemplateItemStep};
use crate::repositories::items as items_repository;

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

#[derive(Deserialize)]
pub struct CreateTemplateItemStepInput {
    pub title: String,
    pub status: String,
}

#[derive(Deserialize)]
pub struct UpdateTemplateItemStepInput {
    pub title: Option<String>,
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
pub fn get_template_items(
    limit: Option<i64>,
    state: State<'_, DbState>,
) -> Result<Vec<TemplateItem>, String> {
    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    let normalized_limit = limit
        .unwrap_or(100)
        .clamp(1, items_repository::MAX_LIST_LIMIT);

    items_repository::list_items(&connection, normalized_limit).map_err(|error| error.to_string())
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
    let normalized_page_size = page_size
        .unwrap_or(items_repository::DEFAULT_PAGE_SIZE)
        .clamp(1, items_repository::MAX_PAGE_SIZE);
    let normalized_query = normalize_optional_string(query);
    let normalized_status = normalize_optional_status(status)?;
    let (items, total) = items_repository::paginate_items(
        &connection,
        normalized_page,
        normalized_page_size,
        normalized_query,
        normalized_status,
    )
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

    let title = normalize_title(&item.title)?;
    let summary = item.summary.trim().to_string();
    let status = normalize_status(Some(item.status.as_str()))?;

    let id = items_repository::create_item(&mut connection, &title, &summary, &status)
        .map_err(|error| error.to_string())?;

    map_item_not_found(items_repository::fetch_item_by_id(&connection, &id))
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

    let current = map_item_not_found(items_repository::fetch_item_by_id(&connection, &id))?;

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

    items_repository::update_item(&mut connection, &id, &title, &summary, &status)
        .map_err(map_item_repository_error)?;

    map_item_not_found(items_repository::fetch_item_by_id(&connection, &id))
}

#[tauri::command]
pub fn delete_template_item(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let mut connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    map_item_not_found(items_repository::fetch_item_by_id(&connection, &id))?;
    items_repository::delete_item(&mut connection, &id).map_err(map_item_repository_error)?;
    Ok(())
}

#[tauri::command]
pub fn get_template_item_steps(
    item_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<TemplateItemStep>, String> {
    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    map_item_not_found(items_repository::fetch_item_by_id(&connection, &item_id))?;
    items_repository::list_item_steps(&connection, &item_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_template_item_step(
    item_id: String,
    step: CreateTemplateItemStepInput,
    state: State<'_, DbState>,
) -> Result<TemplateItemStep, String> {
    let mut connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    let title = normalize_title(&step.title)?;
    let status = normalize_step_status(Some(step.status.as_str()))?;
    let id = items_repository::create_item_step(&mut connection, &item_id, &title, &status)
        .map_err(map_item_repository_error)?;

    map_step_not_found(items_repository::fetch_item_step_by_id(&connection, &id))
}

#[tauri::command]
pub fn update_template_item_step(
    id: String,
    data: UpdateTemplateItemStepInput,
    state: State<'_, DbState>,
) -> Result<TemplateItemStep, String> {
    let mut connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    let current = map_step_not_found(items_repository::fetch_item_step_by_id(&connection, &id))?;

    let title = match data.title.as_deref() {
        Some(value) => normalize_title(value)?,
        None => current.title.clone(),
    };
    let status = match data.status.as_deref() {
        Some(value) => normalize_step_status(Some(value))?,
        None => current.status.clone(),
    };

    items_repository::update_item_step(&mut connection, &id, &title, &status)
        .map_err(map_step_repository_error)?;

    map_step_not_found(items_repository::fetch_item_step_by_id(&connection, &id))
}

#[tauri::command]
pub fn delete_template_item_step(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let mut connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    map_step_not_found(items_repository::fetch_item_step_by_id(&connection, &id))?;
    items_repository::delete_item_step(&mut connection, &id).map_err(map_step_repository_error)?;
    Ok(())
}

#[tauri::command]
pub fn get_template_overview(state: State<'_, DbState>) -> Result<TemplateOverview, String> {
    let connection = state
        .0
        .lock()
        .map_err(|error| format!("failed to lock database: {error}"))?;

    items_repository::fetch_overview(&connection).map_err(|error| error.to_string())
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

fn normalize_step_status(value: Option<&str>) -> Result<String, String> {
    match value.map(str::trim) {
        Some("pending") => Ok("pending".to_string()),
        Some("done") => Ok("done".to_string()),
        Some(_) => Err("invalid step status".to_string()),
        None => Ok("pending".to_string()),
    }
}

fn map_item_not_found(
    result: Result<TemplateItem, rusqlite::Error>,
) -> Result<TemplateItem, String> {
    result.map_err(map_item_repository_error)
}

fn map_step_not_found(
    result: Result<TemplateItemStep, rusqlite::Error>,
) -> Result<TemplateItemStep, String> {
    result.map_err(map_step_repository_error)
}

fn map_item_repository_error(error: rusqlite::Error) -> String {
    match error {
        rusqlite::Error::QueryReturnedNoRows => "item not found".to_string(),
        other => other.to_string(),
    }
}

fn map_step_repository_error(error: rusqlite::Error) -> String {
    match error {
        rusqlite::Error::QueryReturnedNoRows => "step not found".to_string(),
        other => other.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::{normalize_status, normalize_step_status, normalize_title};

    #[test]
    fn status_normalization_rejects_invalid_values() {
        assert_eq!(normalize_status(Some("active")).unwrap(), "active");
        assert!(normalize_status(Some("unknown")).is_err());
    }

    #[test]
    fn step_status_normalization_rejects_invalid_values() {
        assert_eq!(normalize_step_status(Some("done")).unwrap(), "done");
        assert!(normalize_step_status(Some("paused")).is_err());
    }

    #[test]
    fn title_normalization_requires_content() {
        assert!(normalize_title("   ").is_err());
        assert_eq!(normalize_title("  Sample  ").unwrap(), "Sample");
    }
}
