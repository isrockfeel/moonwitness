use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
pub struct GateStep {
    pub state: String,
    pub step: String,
    pub detail: String,
}

#[derive(Serialize, Clone)]
pub struct GateResult {
    pub gate: String,
    pub passed: bool,
    pub exit_code: i32,
    pub duration_ms: u64,
    pub steps: Vec<GateStep>,
}

#[derive(Serialize, Clone)]
struct GateEvent {
    kind: String,
    line: String,
}

/// Parse a gatecheck output line into a structured step, if it matches.
///
/// Gatecheck prints lines like:
///   "  PASS            node-version           v24.22.1 (requires >=20)"
fn parse_step_line(line: &str) -> Option<GateStep> {
    const STATES: [&str; 4] = ["PASS", "FAIL", "BLOCKED", "NOT APPLICABLE"];
    let trimmed = line.trim_start();
    for state in STATES {
        if let Some(rest) = trimmed.strip_prefix(state) {
            let rest = rest.trim();
            let mut parts = rest.splitn(2, char::is_whitespace);
            let step = parts.next()?.trim();
            let detail = parts.next().unwrap_or("").trim();
            if step.is_empty() {
                return None;
            }
            return Some(GateStep {
                state: state.to_string(),
                step: step.to_string(),
                detail: detail.to_string(),
            });
        }
    }
    None
}

/// Run a gate command and stream its output to the frontend via Tauri events.
///
/// Exit-code fidelity: the real exit code from `pnpm gate:<name>` is preserved
/// and returned. A non-zero exit is a real failure, never swallowed.
#[tauri::command]
pub fn scope_run_gate(
    app: AppHandle,
    gate: String,
    repo_root: String,
) -> Result<GateResult, String> {
    let valid = ["quick", "local", "push", "release", "doctor"];
    if !valid.contains(&gate.as_str()) {
        return Err(format!("unknown gate: {}", gate));
    }

    let started = std::time::Instant::now();
    let script = format!("gate:{}", gate);

    let mut child = Command::new("pnpm")
        .args(["run", &script])
        .current_dir(&repo_root)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to spawn pnpm: {}", e))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    let (tx, rx) = mpsc::channel::<GateEvent>();

    // Stream stdout.
    let tx_out = tx.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = tx_out.send(GateEvent {
                    kind: "stdout".into(),
                    line: line.clone(),
                });
            }
        }
    });

    // Stream stderr.
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = tx.send(GateEvent {
                    kind: "stderr".into(),
                    line: line.clone(),
                });
            }
        }
    });

    // Collect steps while streaming events to the frontend.
    let mut steps: Vec<GateStep> = Vec::new();
    let mut done = false;
    while !done {
        match rx.recv_timeout(std::time::Duration::from_millis(200)) {
            Ok(event) => {
                if event.kind == "stdout" {
                    if let Some(step) = parse_step_line(&event.line) {
                        steps.push(step);
                    }
                }
                let _ = app.emit("gate:event", &event);
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Check if the child has exited.
                if let Ok(Some(_)) = child.try_wait() {
                    done = true;
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                done = true;
            }
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    let exit_code = status.code().unwrap_or(-1);
    let duration_ms = started.elapsed().as_millis() as u64;

    let passed = exit_code == 0;
    let result = GateResult {
        gate: gate.clone(),
        passed,
        exit_code,
        duration_ms,
        steps,
    };

    let _ = app.emit("gate:done", &result);
    Ok(result)
}