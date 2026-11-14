mod commands;

use commands::branch::scope_branch_guard;
use commands::commit::{scope_suggest_scope, scope_validate_commit};
use commands::db::scope_db_path;
use commands::gate::scope_run_gate;
use commands::git::scope_git_status;
use commands::journal::scope_daily_journal;
use commands::release::scope_release_radar;
use commands::risk::scope_risk_map;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            scope_git_status,
            scope_db_path,
            scope_run_gate,
            scope_branch_guard,
            scope_validate_commit,
            scope_suggest_scope,
            scope_release_radar,
            scope_risk_map,
            scope_daily_journal
        ])
        .run(tauri::generate_context!())
        .expect("error while running Scope");
}