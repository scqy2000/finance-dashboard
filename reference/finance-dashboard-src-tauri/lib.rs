pub mod commands;
pub mod db;

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

            // Initialize Database
            let conn = db::init_db(&app.handle()).expect("Failed to initialize database");
            app.manage(commands::DbState(Mutex::new(conn)));

            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_accounts,
            commands::get_account,
            commands::create_account,
            commands::update_account,
            commands::delete_account,
            commands::get_transactions,
            commands::get_transactions_page,
            commands::create_transaction,
            commands::update_transaction,
            commands::delete_transaction,
            commands::get_finance_snapshot,
            commands::get_category_trend,
            commands::get_categories,
            commands::create_category,
            commands::update_category,
            commands::delete_category,
            commands::get_installments,
            commands::get_installments_by_account,
            commands::create_installment,
            commands::get_periods,
            commands::pay_period,
            commands::cancel_installment,
            commands::load_api_key,
            commands::save_api_key,
            commands::clear_api_key,
            commands::get_app_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
