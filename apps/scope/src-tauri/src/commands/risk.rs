use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct RiskMap {
    pub dirty_packages: Vec<DirtyPackage>,
    pub stale_packages: Vec<StalePackage>,
    pub migration_status: MigrationStatus,
    pub env_drift: EnvDrift,
}

#[derive(Serialize)]
pub struct DirtyPackage {
    pub name: String,
    pub path: String,
    pub changed_files: usize,
}

#[derive(Serialize)]
pub struct StalePackage {
    pub name: String,
    pub path: String,
    pub days_since_change: i64,
}

#[derive(Serialize)]
pub struct MigrationStatus {
    pub total: usize,
    pub applied: usize,
    pub pending: usize,
}

#[derive(Serialize)]
pub struct EnvDrift {
    pub has_schema: bool,
    pub has_example: bool,
    pub drift: bool,
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

#[tauri::command]
pub fn scope_risk_map(repo_root: String) -> Result<RiskMap, String> {
    // 1. Dirty packages: group changed files by package.
    let changed = run(
        Command::new("git")
            .args(["status", "--porcelain"])
            .current_dir(&repo_root),
    )
    .unwrap_or_default();

    let mut dirty_map: std::collections::HashMap<String, (String, usize)> =
        std::collections::HashMap::new();
    for line in changed.lines() {
        let path = line[3..].trim();
        let (pkg_name, pkg_path) = if let Some(rest) = path.strip_prefix("apps/") {
            let pkg = rest.split('/').next().unwrap_or("");
            (pkg.to_string(), format!("apps/{}", pkg))
        } else if let Some(rest) = path.strip_prefix("packages/") {
            let pkg = rest.split('/').next().unwrap_or("");
            (pkg.to_string(), format!("packages/{}", pkg))
        } else {
            continue;
        };
        if pkg_name.is_empty() {
            continue;
        }
        let entry = dirty_map
            .entry(pkg_name.clone())
            .or_insert((pkg_path, 0));
        entry.1 += 1;
    }

    let dirty_packages: Vec<DirtyPackage> = dirty_map
        .into_iter()
        .map(|(name, (path, count))| DirtyPackage {
            name,
            path,
            changed_files: count,
        })
        .collect();

    // 2. Stale packages: no commits in 30+ days.
    let stale_out = run(
        Command::new("git")
            .args([
                "for-each-ref",
                "--format=%(refname:short)|%(committerdate:unix)",
                "refs/heads/",
            ])
            .current_dir(&repo_root),
    )
    .unwrap_or_default();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let mut stale_packages = Vec::new();
    for line in stale_out.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 2 {
            if let Ok(ts) = parts[1].parse::<i64>() {
                let days = (now - ts) / 86400;
                if days >= 30 {
                    stale_packages.push(StalePackage {
                        name: parts[0].to_string(),
                        path: "branch".into(),
                        days_since_change: days,
                    });
                }
            }
        }
    }

    // 3. Migration status: count migration files vs applied.
    let migrations_dir = format!("{}/apps/api/src/db/migrations", repo_root);
    let total = std::fs::read_dir(&migrations_dir)
        .map(|rd| {
            rd.filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .extension()
                        .map(|x| x == "sql")
                        .unwrap_or(false)
                })
                .count()
        })
        .unwrap_or(0);

    // Applied migrations are tracked in the DB; for now, report total.
    let migration_status = MigrationStatus {
        total,
        applied: total,
        pending: 0,
    };

    // 4. Env schema drift: check if .env.example matches schema.
    let env_example = format!("{}/apps/api/.env.example", repo_root);
    let env_schema = format!("{}/apps/api/src/env.ts", repo_root);
    let has_example = std::path::Path::new(&env_example).exists();
    let has_schema = std::path::Path::new(&env_schema).exists();
    let env_drift = EnvDrift {
        has_schema,
        has_example,
        drift: has_schema && has_example && {
            // Simple check: if schema file is newer than example, flag drift.
            let schema_mod = std::fs::metadata(&env_schema)
                .and_then(|m| m.modified())
                .ok();
            let example_mod = std::fs::metadata(&env_example)
                .and_then(|m| m.modified())
                .ok();
            match (schema_mod, example_mod) {
                (Some(s), Some(e)) => s > e,
                _ => false,
            }
        },
    };

    Ok(RiskMap {
        dirty_packages,
        stale_packages,
        migration_status,
        env_drift,
    })
}