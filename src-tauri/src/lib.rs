pub mod commands;
pub mod db;
pub mod repositories;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let connection = db::init_db(&app.handle()).expect("failed to initialize database");
            app.manage(commands::DbState(Mutex::new(connection)));

            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::items::get_template_items,
            commands::items::get_template_items_page,
            commands::items::create_template_item,
            commands::items::update_template_item,
            commands::items::delete_template_item,
            commands::items::delete_template_items_batch,
            commands::items::update_template_items_status_batch,
            commands::items::get_template_item_steps,
            commands::items::create_template_item_step,
            commands::items::update_template_item_step,
            commands::items::delete_template_item_step,
            commands::items::get_template_overview,
            commands::settings::load_app_setting,
            commands::settings::save_app_setting,
            commands::settings::clear_app_setting,
            commands::system::get_app_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
