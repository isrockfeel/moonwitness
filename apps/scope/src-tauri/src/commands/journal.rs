use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct DailyJournal {
    pub date: String,
    pub commits: Vec<CommitEntry>,
    pub gate_runs: Vec<GateRunEntry>,
    pub summary: String,
}

#[derive(Serialize)]
pub struct CommitEntry {
    pub sha: String,
    pub message: String,
    pub author: String,
    pub time: String,
}

#[derive(Serialize)]
pub struct GateRunEntry {
    pub gate: String,
    pub outcome: String,
    pub duration_ms: u64,
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
pub fn scope_daily_journal(repo_root: String) -> Result<DailyJournal, String> {
    // Today's date.
    let date = run(Command::new("date").args(["+%Y-%m-%d"]))
        .unwrap_or_else(|_| "unknown".into());

    // Commits since midnight.
    let commits_out = run(
        Command::new("git")
            .args([
                "log",
                "--since=midnight",
                "--format=%H|%s|%an|%ai",
            ])
            .current_dir(&repo_root),
    )
    .unwrap_or_default();

    let mut commits = Vec::new();
    for line in commits_out.lines() {
        let parts: Vec<&str> = line.splitn(4, '|').collect();
        if parts.len() >= 4 {
            commits.push(CommitEntry {
                sha: parts[0][..7.min(parts[0].len())].to_string(),
                message: parts[1].to_string(),
                author: parts[2].to_string(),
                time: parts[3].to_string(),
            });
        }
    }

    // Gate runs from audit log (if DB is available).
    // For now, return empty — the DB integration will populate this.
    let gate_runs = Vec::new();

    // Build summary.
    let summary = if commits.is_empty() {
        "No commits yet today.".to_string()
    } else {
        format!(
            "{} commit(s) today by {} author(s).",
            commits.len(),
            commits
                .iter()
                .map(|c| c.author.as_str())
                .collect::<std::collections::HashSet<_>>()
                .len()
        )
    };

    Ok(DailyJournal {
        date,
        commits,
        gate_runs,
        summary,
    })
}