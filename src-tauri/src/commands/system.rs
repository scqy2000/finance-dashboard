use serde_json::json;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn get_app_info(app_handle: AppHandle) -> serde_json::Value {
    let version = app_handle.package_info().version.to_string();
    let user_data = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    json!({
        "version": version,
        "userData": user_data,
        "isPackaged": !cfg!(debug_assertions),
    })
}
