use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct BranchInfo {
    pub current: String,
    pub protected: bool,
    pub allowed: bool,
    pub reason: String,
    pub ahead: i64,
    pub behind: i64,
    pub upstream: Option<String>,
    pub topology: Topology,
}

#[derive(Serialize)]
pub struct Topology {
    pub branches: Vec<BranchNode>,
}

#[derive(Serialize)]
pub struct BranchNode {
    pub name: String,
    pub is_current: bool,
    pub is_protected: bool,
    pub last_commit: String,
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

const PROTECTED: [&str; 2] = ["main", "master"];

#[tauri::command]
pub fn scope_branch_guard() -> Result<BranchInfo, String> {
    let current = run(Command::new("git").args(["branch", "--show-current"]))?;

    let is_protected = PROTECTED.contains(&current.as_str());

    // Determine if push is allowed.
    let (allowed, reason) = if is_protected {
        (
            false,
            format!(
                "'{}' is protected; integration happens on dev",
                current
            ),
        )
    } else if current == "dev" {
        (true, "integration branch — push allowed".into())
    } else if current.starts_with("feat/")
        || current.starts_with("fix/")
        || current.starts_with("chore/")
    {
        (true, format!("feature branch '{}' — integrates to dev", current))
    } else if current.is_empty() {
        (false, "detached HEAD — check out dev first".into())
    } else {
        (true, format!("branch '{}' — ensure it integrates to dev", current))
    };

    // Upstream tracking.
    let upstream = run(
        Command::new("git")
            .args(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]),
    )
    .ok();

    let (ahead, behind) = if upstream.is_some() {
        let counts = run(
            Command::new("git")
                .args(["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
        )?;
        let mut parts = counts.split_whitespace();
        let behind = parts.next().unwrap_or("0").parse().unwrap_or(0);
        let ahead = parts.next().unwrap_or("0").parse().unwrap_or(0);
        (ahead, behind)
    } else {
        (0, 0)
    };

    // Build topology: list local branches with last commit.
    let branches_out = run(Command::new("git").args([
        "for-each-ref",
        "--format=%(refname:short)|%(objectname:short)|%(committerdate:relative)",
        "refs/heads/",
    ]))?;

    let mut branches = Vec::new();
    for line in branches_out.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 2 {
            let name = parts[0].to_string();
            branches.push(BranchNode {
                is_current: name == current,
                is_protected: PROTECTED.contains(&name.as_str()),
                name,
                last_commit: parts[1].to_string(),
            });
        }
    }

    Ok(BranchInfo {
        current,
        protected: is_protected,
        allowed,
        reason,
        ahead,
        behind,
        upstream,
        topology: Topology { branches },
    })
}