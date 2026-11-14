use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct CommitValidation {
    pub valid: bool,
    pub problems: Vec<String>,
    pub parsed: Option<ParsedCommit>,
}

#[derive(Serialize)]
pub struct ParsedCommit {
    pub r#type: String,
    pub scope: Option<String>,
    pub breaking: bool,
    pub subject: String,
}

#[derive(Serialize)]
pub struct ScopeSuggestion {
    pub scope: String,
    pub packages: Vec<String>,
}

const TYPES: [&str; 11] = [
    "build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style",
    "test",
];

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

/// Validate a commit message against Conventional Commits.
#[tauri::command]
pub fn scope_validate_commit(message: String) -> CommitValidation {
    let header = message.lines().next().unwrap_or("").trim();

    if header.is_empty() {
        return CommitValidation {
            valid: false,
            problems: vec!["empty commit message".into()],
            parsed: None,
        };
    }

    // Merge and revert commits are exempt.
    if header.starts_with("Merge ") || header.starts_with("Revert \"") {
        return CommitValidation {
            valid: true,
            problems: vec![],
            parsed: None,
        };
    }

    // Parse: <type>(<scope>): <subject>
    let (rest, breaking) = if let Some(r) = header.strip_suffix('!') {
        (r, true)
    } else {
        (header, false)
    };

    let colon = match rest.find(": ") {
        Some(i) => i,
        None => {
            return CommitValidation {
                valid: false,
                problems: vec![format!(
                    "header does not match \"<type>(<scope>): <subject>\": {}",
                    header
                )],
                parsed: None,
            };
        }
    };

    let left = &rest[..colon];
    let subject = rest[colon + 2..].to_string();

    // Split type and scope.
    let (r#type, scope) = if let Some(paren) = left.find('(') {
        if !left.ends_with(')') {
            return CommitValidation {
                valid: false,
                problems: vec![format!("unclosed scope in: {}", left)],
                parsed: None,
            };
        }
        let t = left[..paren].to_string();
        let s = left[paren + 1..left.len() - 1].to_string();
        (t, Some(s))
    } else {
        (left.to_string(), None)
    };

    let mut problems = Vec::new();

    if !TYPES.contains(&r#type.as_str()) {
        problems.push(format!(
            "unknown type '{}' (allowed: {})",
            r#type,
            TYPES.join(", ")
        ));
    }

    if subject.len() > 72 {
        problems.push(format!("subject is {} chars (max 72)", subject.len()));
    }
    if subject.starts_with(|c: char| c.is_ascii_uppercase()) {
        problems.push("subject should start lowercase".into());
    }
    if subject.ends_with('.') {
        problems.push("subject should not end with a period".into());
    }

    let valid = problems.is_empty();
    CommitValidation {
        valid,
        problems,
        parsed: Some(ParsedCommit {
            r#type,
            scope,
            breaking,
            subject,
        }),
    }
}

/// Suggest a commit scope from the staged/changed packages.
#[tauri::command]
pub fn scope_suggest_scope(repo_root: String) -> Result<ScopeSuggestion, String> {
    // Get changed files (staged + unstaged).
    let changed = run(
        Command::new("git")
            .args(["status", "--porcelain"])
            .current_dir(&repo_root),
    )?;

    let mut packages: Vec<String> = Vec::new();
    for line in changed.lines() {
        let path = line[3..].trim();
        // Extract package name from path like "apps/scope/..." or "packages/ui/..."
        if let Some(rest) = path.strip_prefix("apps/") {
            let pkg = rest.split('/').next().unwrap_or("");
            if !pkg.is_empty() && !packages.contains(&pkg.to_string()) {
                packages.push(pkg.to_string());
            }
        } else if let Some(rest) = path.strip_prefix("packages/") {
            let pkg = rest.split('/').next().unwrap_or("");
            if !pkg.is_empty() && !packages.contains(&pkg.to_string()) {
                packages.push(pkg.to_string());
            }
        }
    }

    // If multiple packages, suggest the first; if one, use it; if none, suggest "core".
    let scope = if packages.len() == 1 {
        packages[0].clone()
    } else if packages.len() > 1 {
        // Sort and pick the most specific (longest name).
        packages.sort_by(|a, b| b.len().cmp(&a.len()));
        packages[0].clone()
    } else {
        "core".into()
    };

    Ok(ScopeSuggestion { scope, packages })
}