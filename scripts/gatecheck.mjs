#!/usr/bin/env node
/**
 * MoonWitness local gate engine.
 *
 * Every step reports exactly one state: PASS, FAIL, BLOCKED or NOT APPLICABLE.
 * No step may swallow an exit code.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const STATE = {
  PASS: "PASS",
  FAIL: "FAIL",
  BLOCKED: "BLOCKED",
  NA: "NOT APPLICABLE",
};

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

const STATE_COLOR = {
  [STATE.PASS]: COLORS.green,
  [STATE.FAIL]: COLORS.red,
  [STATE.BLOCKED]: COLORS.yellow,
  [STATE.NA]: COLORS.dim,
};

const PROTECTED_BRANCHES = ["main", "master"];
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".sh",
  ".toml",
]);

function run(cmd, args, options = {}) {
  const started = Date.now();
  const result = spawnSync(cmd, args, {
    cwd: options.cwd ?? ROOT,
    stdio: "pipe",
    encoding: "utf-8",
    env: { ...process.env, ...(options.env ?? {}) },
    shell: true,
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    code: result.status ?? -1,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
    duration: Date.now() - started,
  };
}

function tail(text, lines = 40) {
  if (!text) return "";
  const parts = text.split(/\r?\n/);
  return parts.slice(Math.max(0, parts.length - lines)).join("\n");
}

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf-8"));
}

class Gate {
  constructor(name) {
    this.name = name;
    this.results = [];
  }

  add(state, step, detail = "", output = "") {
    this.results.push({ state, step, detail, output });
    return state;
  }

  passed() {
    return this.results.every((r) => r.state === STATE.PASS || r.state === STATE.NA);
  }

  report() {
    const counts = { [STATE.PASS]: 0, [STATE.FAIL]: 0, [STATE.BLOCKED]: 0, [STATE.NA]: 0 };
    for (const r of this.results) counts[r.state] += 1;

    console.log(`\n${COLORS.bold}gate:${this.name}${COLORS.reset}`);
    for (const r of this.results) {
      const color = STATE_COLOR[r.state];
      console.log(
        `  ${color}${r.state.padEnd(15)}${COLORS.reset} ${r.step.padEnd(22)} ${COLORS.dim}${r.detail}${COLORS.reset}`,
      );
      if (r.output && r.state !== STATE.PASS) {
        console.log(
          r.output
            .split(/\r?\n/)
            .map((line) => `      ${line}`)
            .join("\n"),
        );
      }
    }

    const summary = [
      `${counts[STATE.PASS]} passed`,
      `${counts[STATE.FAIL]} failed`,
      `${counts[STATE.BLOCKED]} blocked`,
      `${counts[STATE.NA]} not applicable`,
    ].join(", ");
    const color = this.passed() ? COLORS.green : COLORS.red;
    console.log(`  ${color}${COLORS.bold}${summary}${COLORS.reset}\n`);
  }

  exitCode() {
    return this.passed() ? 0 : 1;
  }
}

function currentBranch() {
  const result = run("git", ["branch", "--show-current"]);
  return result.code === 0 ? result.stdout : "";
}

function commitRange() {
  if (run("git", ["rev-parse", "--verify", "--quiet", "@{upstream}"]).code === 0) {
    return "@{upstream}..HEAD";
  }
  if (run("git", ["rev-parse", "--verify", "--quiet", "origin/dev"]).code === 0) {
    return "origin/dev..HEAD";
  }
  return "HEAD~1..HEAD";
}

function stepToolchain(gate) {
  const major = Number(process.version.slice(1).split(".")[0]);
  gate.add(
    major >= 20 ? STATE.PASS : STATE.FAIL,
    "node-version",
    `${process.version} (requires >=20)`,
  );

  const pnpm = run("pnpm", ["--version"]);
  if (pnpm.code !== 0) {
    gate.add(STATE.FAIL, "pnpm", "pnpm is not resolvable on PATH");
  } else {
    const expected = readJson("package.json").packageManager?.split("@")[1];
    if (expected && pnpm.stdout !== expected) {
      gate.add(
        STATE.BLOCKED,
        "pnpm",
        `packageManager pins ${expected}, PATH resolves ${pnpm.stdout}`,
      );
    } else {
      gate.add(STATE.PASS, "pnpm", pnpm.stdout);
    }
  }

  gate.add(
    existsSync(join(ROOT, "pnpm-lock.yaml")) ? STATE.PASS : STATE.FAIL,
    "lockfile",
    "pnpm-lock.yaml",
  );
  gate.add(
    existsSync(join(ROOT, "pnpm-workspace.yaml")) ? STATE.PASS : STATE.FAIL,
    "workspace",
    "pnpm-workspace.yaml",
  );
}

function stepCommand(gate, step, cmd, args, options = {}) {
  const result = run(cmd, args, options);
  if (result.code === 0) {
    gate.add(STATE.PASS, step, `${result.duration}ms`);
  } else {
    gate.add(
      STATE.FAIL,
      step,
      `exit ${result.code} after ${result.duration}ms`,
      tail([result.stdout, result.stderr].filter(Boolean).join("\n")),
    );
  }
  return result.code === 0;
}

const SECRET_PATTERNS = [
  { name: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "github-pat", re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/ },
  { name: "openai-key", re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: "aws-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
];

function stepSecretScan(gate) {
  const listed = run("git", ["ls-files", "-z"]);
  if (listed.code !== 0) {
    gate.add(STATE.BLOCKED, "secret-scan", "git ls-files failed");
    return;
  }

  const files = listed.stdout.split("\0").filter(Boolean);
  const findings = [];
  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(extname(file))) continue;
    if (file.includes("node_modules/") || file.endsWith("pnpm-lock.yaml")) continue;

    let content;
    try {
      content = readFileSync(join(ROOT, file), "utf-8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.re.test(lines[i])) findings.push(`${file}:${i + 1} ${pattern.name}`);
      }
    }
  }

  if (findings.length === 0) {
    gate.add(STATE.PASS, "secret-scan", `${files.length} tracked files`);
  } else {
    gate.add(STATE.FAIL, "secret-scan", `${findings.length} finding(s)`, findings.join("\n"));
  }
}

function stepBranchPolicy(gate) {
  const branch = currentBranch();
  if (!branch) {
    gate.add(STATE.BLOCKED, "branch", "detached HEAD — check out dev first");
    return;
  }
  if (PROTECTED_BRANCHES.includes(branch)) {
    gate.add(STATE.BLOCKED, "branch", `'${branch}' is protected; integration happens on dev`);
    return;
  }
  gate.add(STATE.PASS, "branch", branch);
}

function stepWorktree(gate, allowDirty) {
  const result = run("git", ["status", "--porcelain"]);
  if (result.code !== 0) {
    gate.add(STATE.BLOCKED, "worktree", "git status failed");
    return;
  }
  if (!result.stdout) {
    gate.add(STATE.PASS, "worktree", "clean");
    return;
  }
  const count = result.stdout.split(/\r?\n/).length;
  if (allowDirty) {
    gate.add(STATE.NA, "worktree", `${count} uncommitted path(s), acknowledged`, result.stdout);
  } else {
    gate.add(STATE.BLOCKED, "worktree", `${count} uncommitted path(s)`, result.stdout);
  }
}

function stepAudit(gate) {
  const result = run("pnpm", ["audit", "--prod", "--audit-level=high"]);
  const text = [result.stdout, result.stderr].filter(Boolean).join("\n");
  if (result.code === 0 || /No known vulnerabilities|found 0 vulnerabilities/i.test(text)) {
    gate.add(STATE.PASS, "dependency-audit", "no high/critical advisories");
    return;
  }
  if (/ERR_PNPM|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|network/i.test(text)) {
    gate.add(
      STATE.BLOCKED,
      "dependency-audit",
      "registry unreachable, audit not performed",
      tail(text, 10),
    );
    return;
  }
  gate.add(STATE.FAIL, "dependency-audit", "high/critical advisories found", tail(text, 30));
}

function stepCommitMessages(gate) {
  const range = commitRange();
  const result = run("node", ["scripts/commitlint.mjs", "--range", range]);
  if (result.code === 0) {
    gate.add(STATE.PASS, "commit-messages", range);
  } else {
    gate.add(
      STATE.FAIL,
      "commit-messages",
      `non-conventional commit(s) in ${range}`,
      tail([result.stdout, result.stderr].filter(Boolean).join("\n")),
    );
  }
}

function quickSteps(gate) {
  stepToolchain(gate);
  if (!gate.passed()) return;
  stepCommand(gate, "format", "pnpm", ["format:check"]);
  stepCommand(gate, "lint", "pnpm", ["lint", "--filter=@moonwitness/*"]);
  stepCommand(gate, "typecheck", "pnpm", ["typecheck", "--filter=@moonwitness/*"]);
}

function localSteps(gate) {
  stepToolchain(gate);
  if (!gate.passed()) return;
  stepCommand(gate, "install", "pnpm", ["install", "--frozen-lockfile"]);
  stepCommand(gate, "format", "pnpm", ["format:check"]);
  stepCommand(gate, "lint", "pnpm", ["lint"]);
  stepCommand(gate, "typecheck", "pnpm", ["typecheck"]);
  stepCommand(gate, "test", "pnpm", ["test"]);
  stepCommand(gate, "build", "pnpm", ["build"]);
}

function gateQuick() {
  const gate = new Gate("quick");
  quickSteps(gate);
  gate.report();
  return gate.exitCode();
}

function gateLocal() {
  const gate = new Gate("local");
  localSteps(gate);
  gate.report();
  return gate.exitCode();
}

function gatePush(argv) {
  const allowDirty = argv.includes("--allow-dirty");
  const gate = new Gate("push");
  stepBranchPolicy(gate);
  stepWorktree(gate, allowDirty);
  localSteps(gate);
  stepCommand(gate, "whitespace", "git", ["diff", "--check", "HEAD"]);
  stepSecretScan(gate);
  stepAudit(gate);
  stepCommitMessages(gate);
  gate.report();
  return gate.exitCode();
}

function gateRelease() {
  const gate = new Gate("release");

  const branch = currentBranch();
  if (branch !== "main") {
    gate.add(
      STATE.BLOCKED,
      "branch",
      `release is validated on 'main' (currently '${branch}'); promotion is owner-approved`,
    );
  } else {
    gate.add(STATE.PASS, "branch", branch);
  }

  const status = run("git", ["status", "--porcelain"]);
  gate.add(
    status.code === 0 && !status.stdout ? STATE.PASS : STATE.BLOCKED,
    "worktree",
    status.code === 0 && !status.stdout ? "clean" : "release requires a clean working tree",
  );

  localSteps(gate);

  const version = readJson("package.json").version;
  if (!version) {
    gate.add(STATE.FAIL, "release-manifest", "package.json has no version");
  } else if (!existsSync(join(ROOT, ".release-please-manifest.json"))) {
    gate.add(STATE.FAIL, "release-manifest", ".release-please-manifest.json missing");
  } else {
    const manifest = readJson(".release-please-manifest.json")["."];
    gate.add(
      manifest === version ? STATE.PASS : STATE.FAIL,
      "release-manifest",
      `manifest ${manifest ?? "(none)"} vs package.json ${version}`,
    );
  }

  const changelog = existsSync(join(ROOT, "CHANGELOG.md"))
    ? readFileSync(join(ROOT, "CHANGELOG.md"), "utf-8")
    : "";
  const hasEntry = version
    ? new RegExp(`^##+ \\[?${version.replace(/\./g, "\\.")}\\]?`, "m").test(changelog)
    : false;
  gate.add(
    hasEntry ? STATE.PASS : STATE.FAIL,
    "changelog",
    hasEntry ? `entry for ${version}` : `no CHANGELOG entry for ${version ?? "(no version)"}`,
  );

  const tag = version ? run("git", ["tag", "--list", `v${version}`]) : { stdout: "" };
  gate.add(
    tag.stdout ? STATE.FAIL : STATE.PASS,
    "release-tag",
    tag.stdout ? `tag v${version} already exists` : `v${version} is free`,
  );

  gate.report();
  return gate.exitCode();
}

function gateDoctor() {
  const gate = new Gate("doctor");
  stepToolchain(gate);

  const user = run("git", ["config", "user.name"]);
  gate.add(user.stdout ? STATE.PASS : STATE.BLOCKED, "git-user", user.stdout || "unset");
  const email = run("git", ["config", "user.email"]);
  gate.add(email.stdout ? STATE.PASS : STATE.BLOCKED, "git-email", email.stdout || "unset");

  const remote = run("git", ["remote", "get-url", "origin"]);
  gate.add(remote.code === 0 ? STATE.PASS : STATE.BLOCKED, "remote", remote.stdout || "missing");

  const branch = currentBranch();
  if (!branch) {
    gate.add(STATE.BLOCKED, "branch", "detached HEAD");
  } else if (PROTECTED_BRANCHES.includes(branch)) {
    gate.add(STATE.BLOCKED, "branch", `'${branch}' is protected; switch to dev`);
  } else {
    gate.add(STATE.PASS, "branch", branch);
  }

  const upstream = run("git", ["rev-parse", "--abbrev-ref", "@{upstream}"]);
  gate.add(
    upstream.code === 0 ? STATE.PASS : STATE.NA,
    "upstream",
    upstream.code === 0 ? upstream.stdout : "no upstream configured",
  );

  const hooksDir = run("git", ["rev-parse", "--git-path", "hooks"]);
  const hookPath = hooksDir.code === 0 ? join(ROOT, hooksDir.stdout, "pre-push") : "";
  const installed = hookPath !== "" && existsSync(hookPath);
  gate.add(
    installed ? STATE.PASS : STATE.NA,
    "pre-push-hook",
    installed ? "installed" : "run pnpm hooks:install",
  );

  gate.report();
  return gate.exitCode();
}

const GATES = {
  quick: gateQuick,
  local: gateLocal,
  push: gatePush,
  release: gateRelease,
  doctor: gateDoctor,
};

const gateName = process.argv[2];
if (!gateName || !GATES[gateName]) {
  console.log(`
${COLORS.bold}MoonWitness gate engine${COLORS.reset}

Usage: pnpm gate:<command> [--allow-dirty]

Commands:
  quick     fast feedback: format, lint, typecheck
  local     full verification: install, format, lint, typecheck, test, build
  push      branch policy, worktree, local verification, secrets, audit, commits
  release   release readiness on main: verification, version, changelog, tag
  doctor    diagnose the local engineering environment

States: PASS, FAIL, BLOCKED, NOT APPLICABLE
`);
  process.exit(1);
}

process.exit(GATES[gateName](process.argv.slice(3)));
