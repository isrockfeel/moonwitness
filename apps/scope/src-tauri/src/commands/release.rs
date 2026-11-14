use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct ReleaseStatus {
    pub version: String,
    pub manifest_version: Option<String>,
    pub manifest_drift: bool,
    pub changelog_entry: bool,
    pub tag_exists: bool,
    pub tag_free: bool,
    pub ready: bool,
    pub blockers: Vec<String>,
}

fn run(cmd: &mut Command) -> Result<String, String> {
    let out = cmd.output().map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(format!(
            "exit {}: {}",
            out.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

fn read_json_field(path: &str, field: &str) -> Option<String> {
    let content = std::fs::read_to_string(path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    json.get(field)?.as_str().map(|s| s.to_string())
}

#[tauri::command]
pub fn scope_release_radar(repo_root: String) -> Result<ReleaseStatus, String> {
    // Read version from package.json.
    let pkg_path = format!("{}/package.json", repo_root);
    let version = read_json_field(&pkg_path, "version").unwrap_or_default();

    // Check manifest drift.
    let manifest_path = format!("{}/.release-please-manifest.json", repo_root);
    let manifest_version = std::fs::read_to_string(&manifest_path)
        .ok()
        .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
        .and_then(|j| j.get(".").and_then(|v| v.as_str()).map(|s| s.to_string()));

    let manifest_drift = manifest_version.is_some() && manifest_version.as_deref() != Some(&version);

    // Check changelog entry.
    let changelog_path = format!("{}/CHANGELOG.md", repo_root);
    let changelog = std::fs::read_to_string(&changelog_path).unwrap_or_default();
    let escaped = version.replace(|c: char| !c.is_alphanumeric() && c != '.', "\\");
    let changelog_entry = if !version.is_empty() {
        changelog.contains(&format!("## [{}]", version))
            || changelog.contains(&format!("## {}", version))
            || changelog.contains(&format!("## [{}]", escaped))
    } else {
        false
    };

    // Check tag availability.
    let tag = run(
        Command::new("git")
            .args(["tag", "--list", &format!("v{}", version)])
            .current_dir(&repo_root),
    )
    .unwrap_or_default();
    let tag_exists = !tag.is_empty();
    let tag_free = !tag_exists;

    // Build blockers.
    let mut blockers = Vec::new();
    if version.is_empty() {
        blockers.push("package.json has no version".into());
    }
    if manifest_drift {
        blockers.push(format!(
            "manifest drift: {} vs package.json {}",
            manifest_version.as_deref().unwrap_or("(none)"),
            version
        ));
    }
    if !changelog_entry && !version.is_empty() {
        blockers.push(format!("no CHANGELOG entry for {}", version));
    }
    if tag_exists {
        blockers.push(format!("tag v{} already exists", version));
    }

    let ready = blockers.is_empty();

    Ok(ReleaseStatus {
        version,
        manifest_version,
        manifest_drift,
        changelog_entry,
        tag_exists,
        tag_free,
        ready,
        blockers,
    })
}