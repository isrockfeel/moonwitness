use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct GitStatus {
    pub root: String,
    pub branch: String,
    pub dirty: bool,
    pub ahead: i64,
    pub behind: i64,
}

fn run(cmd: &mut Command) -> Result<String, String> {
    let out = cmd.output().map_err(|e| e.to_string())?;
    // Exit-code fidelity: a non-zero status is a real failure, never swallowed.
    if !out.status.success() {
        return Err(format!(
            "command failed (exit {}): {}",
            out.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

#[tauri::command]
pub fn scope_git_status() -> Result<GitStatus, String> {
    let root = run(Command::new("git").args(["rev-parse", "--show-toplevel"]))?;

    let branch = run(Command::new("git").args(["branch", "--show-current"]))?;

    // Dirty = any tracked file changed, staged or unstaged.
    let dirty = !run(Command::new("git").args(["status", "--porcelain"]))?
        .is_empty();

    // ahead/behind vs upstream, parsed from `git rev-list --left-right --count`.
    let upstream = run(
        Command::new("git")
            .args(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]),
    );
    let (ahead, behind) = match upstream {
        Ok(_) => {
            let counts = run(
                Command::new("git")
                    .args(["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
            )?;
            let mut parts = counts.split_whitespace();
            let behind = parts.next().unwrap_or("0").parse().unwrap_or(0);
            let ahead = parts.next().unwrap_or("0").parse().unwrap_or(0);
            (ahead, behind)
        }
        Err(_) => (0, 0),
    };

    Ok(GitStatus {
        root,
        branch,
        dirty,
        ahead,
        behind,
    })
}