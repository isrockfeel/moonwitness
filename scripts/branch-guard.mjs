#!/usr/bin/env node
/**
 * MoonWitness Branch Guard
 * Prevents accidental pushes to protected branches
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(__dirname, "..");

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(level, message) {
  const prefix = {
    info: `${COLORS.cyan}[GUARD]${COLORS.reset}`,
    warn: `${COLORS.yellow}[WARN]${COLORS.reset}`,
    error: `${COLORS.red}[BLOCKED]${COLORS.reset}`,
    pass: `${COLORS.green}[OK]${COLORS.reset}`,
  };
  console.log(`${prefix[level]} ${message}`);
}

function runCommand(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf-8",
  });
  return {
    code: result.code ?? -1,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
  };
}

function getCurrentBranch() {
  const result = runCommand("git", ["branch", "--show-current"]);
  return result.stdout;
}

function getPushTarget() {
  // Check if pushing to a specific ref
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "push" && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return null;
}

function main() {
  const currentBranch = getCurrentBranch();
  const pushTarget = getPushTarget();

  log("info", `Current branch: ${currentBranch || "(detached)"}`);

  // Forbidden branches for direct AI pushes
  const forbidden = ["main", "master"];

  // Check if we're on a forbidden branch
  if (forbidden.includes(currentBranch)) {
    log("error", `Direct pushes to '${currentBranch}' are forbidden by MoonWitness policy.`);
    log("info", 'Switch to "dev" branch for integration: git switch dev');
    process.exit(1);
  }

  // Check push target
  if (pushTarget) {
    if (forbidden.includes(pushTarget)) {
      log("error", `Direct push to '${pushTarget}' is forbidden.`);
      log("info", "Use: git push origin HEAD:refs/heads/dev");
      process.exit(1);
    }
  }

  // Check if trying to push to origin/main or origin/master via default
  const remote = runCommand("git", ["remote", "get-url", "origin"]);
  if (remote.code === 0) {
    log("pass", `Remote: ${remote.stdout}`);
  }

  // Verify we're on dev or a feature branch
  if (currentBranch === "dev") {
    log("pass", 'On integration branch "dev" - push allowed');
  } else if (
    currentBranch.startsWith("feat/") ||
    currentBranch.startsWith("fix/") ||
    currentBranch.startsWith("chore/")
  ) {
    log("pass", `On feature branch "${currentBranch}" - push allowed (integrates to dev)`);
  } else if (currentBranch) {
    log("warn", `On branch "${currentBranch}" - ensure it integrates to dev`);
  }

  log("pass", "Branch guard check passed");
  process.exit(0);
}

main();
