#!/usr/bin/env node
/**
 * MoonWitness Local Gatecheck Engine
 * Enterprise-grade quality gates for local development
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(__dirname, "..");

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(level, message) {
  const prefix = {
    info: `${COLORS.blue}[INFO]${COLORS.reset}`,
    warn: `${COLORS.yellow}[WARN]${COLORS.reset}`,
    error: `${COLORS.red}[ERROR]${COLORS.reset}`,
    pass: `${COLORS.green}[PASS]${COLORS.reset}`,
    fail: `${COLORS.red}[FAIL]${COLORS.reset}`,
    blocked: `${COLORS.yellow}[BLOCKED]${COLORS.reset}`,
  };
  console.log(`${prefix[level]} ${message}`);
}

function runCommand(name, cmd, args, cwd = ROOT, env = {}) {
  const start = Date.now();
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "pipe",
    encoding: "utf-8",
    env: { ...process.env, ...env },
    shell: true,
  });
  const duration = Date.now() - start;
  return {
    name,
    code: result.status ?? -1,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    duration,
  };
}

function checkNodeVersion() {
  const required = ">=20.0.0";
  const current = process.version;
  const major = parseInt(current.slice(1).split(".")[0], 10);
  if (major < 20) {
    return { pass: false, message: `Node ${current} does not satisfy ${required}` };
  }
  return { pass: true, message: `Node ${current} OK` };
}

function checkPnpmVersion() {
  // Try pnpm directly, then via corepack, then via npx
  let result = runCommand("pnpm-version", "pnpm", ["--version"]);
  if (result.code !== 0) {
    result = runCommand("pnpm-version-corepack", "corepack", ["pnpm", "--version"]);
  }
  if (result.code !== 0) {
    result = runCommand("pnpm-version-npx", "npx", ["pnpm@latest", "--version"]);
  }
  if (result.code !== 0) {
    return { pass: false, message: "pnpm not found" };
  }
  return { pass: true, message: `pnpm ${result.stdout} OK` };
}

function checkLockfile() {
  const lockfile = join(ROOT, "pnpm-lock.yaml");
  if (!existsSync(lockfile)) {
    return { pass: false, message: "pnpm-lock.yaml missing" };
  }
  return { pass: true, message: "Lockfile present" };
}

function checkWorkspace() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  if (!pkg.workspaces && !pkg.private) {
    return { pass: false, message: "Not a workspace or private package" };
  }
  return { pass: true, message: "Workspace valid" };
}

function gateQuick() {
  log("info", "Running gate:quick...");
  const checks = [
    { name: "Node version", fn: checkNodeVersion },
    { name: "pnpm version", fn: checkPnpmVersion },
    { name: "Lockfile", fn: checkLockfile },
    { name: "Workspace", fn: checkWorkspace },
  ];

  let allPass = true;
  for (const check of checks) {
    const result = check.fn();
    if (result.pass) {
      log("pass", `${check.name}: ${result.message}`);
    } else {
      log("fail", `${check.name}: ${result.message}`);
      allPass = false;
    }
  }

  // Format check
  const fmt = runCommand("format:check", "pnpm", ["format:check"]);
  if (fmt.code === 0) {
    log("pass", "Format check passed");
  } else {
    log("fail", "Format check failed");
    allPass = false;
  }

  // Lint (targeted)
  const lint = runCommand("lint", "pnpm", ["lint", "--filter=@moonwitness/*"]);
  if (lint.code === 0) {
    log("pass", "Lint passed");
  } else {
    log("fail", "Lint failed");
    allPass = false;
  }

  // Typecheck (targeted)
  const tsc = runCommand("typecheck", "pnpm", ["typecheck", "--filter=@moonwitness/*"]);
  if (tsc.code === 0) {
    log("pass", "Typecheck passed");
  } else {
    log("fail", "Typecheck failed");
    allPass = false;
  }

  return allPass ? 0 : 1;
}

function gateLocal() {
  log("info", "Running gate:local (full verification)...");
  const checks = [
    { name: "Node version", fn: checkNodeVersion },
    { name: "pnpm version", fn: checkPnpmVersion },
    { name: "Lockfile", fn: checkLockfile },
    { name: "Workspace", fn: checkWorkspace },
  ];

  let allPass = true;
  for (const check of checks) {
    const result = check.fn();
    if (result.pass) {
      log("pass", `${check.name}: ${result.message}`);
    } else {
      log("fail", `${check.name}: ${result.message}`);
      allPass = false;
    }
  }

  if (!allPass) return 1;

  const steps = [
    ["Install (frozen)", "pnpm", ["install", "--frozen-lockfile"]],
    ["Format check", "pnpm", ["format:check"]],
    ["Lint", "pnpm", ["lint"]],
    ["Typecheck", "pnpm", ["typecheck"]],
    ["Unit tests", "pnpm", ["test"]],
    ["Build all", "pnpm", ["build"]],
  ];

  for (const [name, cmd, args] of steps) {
    const result = runCommand(name.toLowerCase().replace(/\s+/g, "-"), cmd, args);
    if (result.code === 0) {
      log("pass", `${name} passed (${result.duration}ms)`);
    } else {
      log("fail", `${name} failed (${result.duration}ms)`);
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.log(result.stderr);
      allPass = false;
      break;
    }
  }

  return allPass ? 0 : 1;
}

function gatePush() {
  log("info", "Running gate:push (pre-push verification)...");

  // Run gate:local first
  if (gateLocal() !== 0) {
    return 1;
  }

  // Additional push-specific checks
  let allPass = true;

  // Dependency audit
  const audit = runCommand("audit", "pnpm", ["audit", "--prod"]);
  if (audit.code === 0) {
    log("pass", "Dependency audit passed");
  } else {
    log("warn", "Dependency audit has findings (review required)");
  }

  // Secret scanning (basic)
  const secretScan = runCommand("secret-scan", "npx", [
    "secretlint@latest",
    "**/*",
    "--format",
    "stylish",
  ]);
  if (secretScan.code === 0) {
    log("pass", "Secret scan clean");
  } else {
    log("warn", "Secret scan findings (review required)");
  }

  // Git diff validation
  const diff = runCommand("git-diff", "git", ["diff", "--check"]);
  if (diff.code === 0) {
    log("pass", "Git diff clean (no whitespace errors)");
  } else {
    log("fail", "Git diff has whitespace errors");
    allPass = false;
  }

  // Forbidden branch detection
  const branch = runCommand("current-branch", "git", ["branch", "--show-current"]);
  if (branch.stdout === "main" || branch.stdout === "master") {
    log("fail", `On forbidden branch: ${branch.stdout}`);
    allPass = false;
  } else {
    log("pass", `Current branch: ${branch.stdout}`);
  }

  // Uncommitted change detection
  const status = runCommand("git-status", "git", ["status", "--porcelain"]);
  if (status.stdout.trim()) {
    log("warn", "Uncommitted changes detected");
    console.log(status.stdout);
  } else {
    log("pass", "Working tree clean");
  }

  return allPass ? 0 : 1;
}

function gateRelease() {
  log("info", "Running gate:release (release readiness)...");
  return gatePush(); // Same as push for now, can be extended
}

function gateDoctor() {
  log("info", "Running gate:doctor (environment diagnosis)...");

  checkNodeVersion().pass
    ? log("pass", `Node: ${process.version}`)
    : log("fail", `Node: ${process.version} (need >=20)`);
  checkPnpmVersion().pass ? log("pass", `pnpm available`) : log("fail", `pnpm not found`);
  checkLockfile().pass ? log("pass", "Lockfile present") : log("fail", "Lockfile missing");
  checkWorkspace().pass ? log("pass", "Workspace valid") : log("fail", "Workspace invalid");

  // Git config
  const gitUser = runCommand("git-user", "git", ["config", "user.name"]);
  const gitEmail = runCommand("git-email", "git", ["config", "user.email"]);
  if (gitUser.code === 0 && gitUser.stdout) {
    log("pass", `Git user: ${gitUser.stdout}`);
  } else {
    log("warn", "Git user.name not set");
  }
  if (gitEmail.code === 0 && gitEmail.stdout) {
    log("pass", `Git email: ${gitEmail.stdout}`);
  } else {
    log("warn", "Git user.email not set");
  }

  // Remote
  const remote = runCommand("git-remote", "git", ["remote", "-v"]);
  if (remote.code === 0) {
    log("pass", "Git remote configured");
  } else {
    log("fail", "No git remote");
  }

  // Current branch
  const currentBranch = runCommand("current-branch", "git", ["branch", "--show-current"]);
  log("info", `Current branch: ${currentBranch.stdout}`);

  return 0;
}

const gates = {
  quick: gateQuick,
  local: gateLocal,
  push: gatePush,
  release: gateRelease,
  doctor: gateDoctor,
};

const gateName = process.argv[2];
if (!gateName || !gates[gateName]) {
  console.log(`
${COLORS.bold}MoonWitness Gatecheck Engine${COLORS.reset}

Usage: pnpm gate:<command>

Commands:
  quick     - Fast feedback during implementation
  local     - Comprehensive repository verification
  push      - Full mandatory verification before pushing to dev
  release   - Full release readiness validation
  doctor    - Diagnose local engineering environment
`);
  process.exit(1);
}

const exitCode = gates[gateName]();
if (exitCode === 0) {
  log("pass", `gate:${gateName} completed successfully`);
} else {
  log("fail", `gate:${gateName} failed`);
}
process.exit(exitCode);
