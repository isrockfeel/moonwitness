use tauri::Manager;

/// Resolve the local SQLite database path inside the Tauri app data dir.
///
/// Falls back to a temp dir if the app data dir cannot be resolved.
#[tauri::command]
pub fn scope_db_path(app: tauri::AppHandle) -> String {
    let dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir());
    // Ensure the directory exists.
    let _ = std::fs::create_dir_all(&dir);
    dir.join("scope.db").to_string_lossy().to_string()
}