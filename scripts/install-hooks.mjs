#!/usr/bin/env node
/** Points git at the repository-managed hooks directory. */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: ROOT,
  encoding: "utf-8",
});

if ((result.status ?? -1) !== 0) {
  console.error((result.stderr ?? "").trim() || "failed to set core.hooksPath");
  process.exit(1);
}

console.log("hooks: core.hooksPath = .githooks");
