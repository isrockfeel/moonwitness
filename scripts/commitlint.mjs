#!/usr/bin/env node
/**
 * Conventional Commits validator.
 *
 * Usage:
 *   node scripts/commitlint.mjs --range <git-range>   validate every commit in a range
 *   node scripts/commitlint.mjs --message <text>      validate a single message
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const TYPES = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
];

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9\-./]+)\))?(?<breaking>!)?: (?<subject>.+)$/;
const MERGE = /^Merge (branch|pull request|remote-tracking branch)\b/;
const REVERT = /^Revert "/;

function validate(message) {
  const header = message.split(/\r?\n/)[0].trim();
  if (!header) return ["empty commit message"];
  if (MERGE.test(header) || REVERT.test(header)) return [];

  const match = HEADER.exec(header);
  if (!match) {
    return [`header does not match "<type>(<scope>): <subject>": ${header}`];
  }

  const problems = [];
  if (!TYPES.includes(match.groups.type)) {
    problems.push(`unknown type '${match.groups.type}' (allowed: ${TYPES.join(", ")})`);
  }
  const subject = match.groups.subject;
  if (subject.length > 72) problems.push(`subject is ${subject.length} chars (max 72)`);
  if (/^[A-Z]/.test(subject)) problems.push("subject should start lowercase");
  if (/\.$/.test(subject)) problems.push("subject should not end with a period");
  return problems;
}

function git(args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf-8" });
  if ((result.status ?? -1) !== 0) {
    throw new Error((result.stderr ?? "").trim() || `git ${args.join(" ")} failed`);
  }
  return (result.stdout ?? "").trim();
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
}

const range = readArg("--range");
const single = readArg("--message");

if (!range && !single) {
  console.error("commitlint: pass --range <git-range> or --message <text>");
  process.exit(2);
}

const failures = [];

if (single) {
  for (const problem of validate(single)) failures.push(`message: ${problem}`);
}

if (range) {
  const commits = git(["log", "--format=%H%x00%B%x00END", range])
    .split("END\0")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (commits.length === 0) {
    console.log(`commitlint: no commits in ${range}`);
  }

  for (const entry of commits) {
    const [sha, ...body] = entry.split("\0");
    const message = body.join("\0").trim();
    for (const problem of validate(message)) {
      failures.push(`${sha.slice(0, 7)} ${problem}`);
    }
  }
}

if (failures.length > 0) {
  console.error("commitlint: non-conventional commit(s):");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("commitlint: all commits are conventional");
