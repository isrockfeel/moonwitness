#!/usr/bin/env node
/**
 * Model evaluation harness CLI for Issue #35 — RIOT Intelligence.
 */

import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

// Dynamic import of the harness modules (proper file:// URLs for Windows)
// Note: Import individual files with .ts extension to work with --experimental-strip-types
const typesPath = pathToFileURL(join(ROOT, "packages/ai/src/eval/types.ts")).href;
const fixturesPath = pathToFileURL(join(ROOT, "packages/ai/src/eval/fixtures.ts")).href;
const runnerPath = pathToFileURL(join(ROOT, "packages/ai/src/eval/runner.ts")).href;

const fixturesMod = await import(fixturesPath);
const runnerMod = await import(runnerPath);

const { EvalHarnessRunner } = runnerMod;
const { getSmokeTasks, FIXTURE_TASKS } = fixturesMod;

const ARTIFACTS_DIR = join(ROOT, "artifacts");
const OUTPUT_FILE = join(ARTIFACTS_DIR, `eval-report-${Date.now()}.json`);

function parseArgs() {
  const args = process.argv.slice(2);
  let modelId = process.env.OPENAI_COMPATIBLE_MODEL ?? "gpt-4o-mini";
  let smoke = process.env.EVAL_SMOKE === "1";
  let live = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--model" && args[i + 1]) {
      modelId = args[++i];
    } else if (arg === "--smoke") {
      smoke = true;
    } else if (arg === "--live") {
      live = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { modelId, smoke, live, dryRun };
}

async function main() {
  const { modelId, smoke, live, dryRun } = parseArgs();
  const baseUrl =
    process.env.OPENAI_COMPATIBLE_BASE_URL ?? "https://ai-gateway.apps.mycocolink.com/v1";
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;

  console.log("RIOT Intelligence Model Eval Harness v0.1.0");
  console.log("-------------------------------------------");
  console.log(`Model:        ${modelId}`);
  console.log(`Base URL:     ${baseUrl}`);
  console.log(`Mode:         ${live ? "LIVE" : smoke ? "SMOKE" : "STUB"} `);
  console.log(`Dry run:      ${dryRun}`);
  console.log("");

  if (live && !apiKey) {
    console.error("ERROR: OPENAI_COMPATIBLE_API_KEY is required for live mode.");
    process.exit(1);
  }

  if (dryRun) {
    const tasks = smoke ? getSmokeTasks() : [];
    console.log(`DRY RUN -- would evaluate ${tasks.length} task(s)`);
    for (const t of tasks) {
      console.log(`  [${t.id}] ${t.label}: ${t.prompt.slice(0, 60)}`);
    }
    if (!tasks.length) {
      console.log("  (none in current config)");
    }
    return;
  }

  if (!live && !smoke) {
    console.log(
      "Running smoke-test mode (GPU-free). Set LIVE=1 or --live to test against a real endpoint.",
    );
  }

  const tasks = smoke || !live ? getSmokeTasks() : FIXTURE_TASKS;
  if (!tasks.length) {
    console.log("No tasks to evaluate.");
    process.exit(0);
  }

  const runner = new EvalHarnessRunner({
    baseUrl,
    apiKey,
    modelId,
    tasks,
    timeoutMs: 45_000,
    maxTokens: 80,
    streamForTtft: false,
  });

  console.log(`Starting evaluation of ${tasks.length} task(s)...`);
  const report = await runner.run(baseUrl);

  const s = report.summary;
  console.log("\n=== Results ===");
  console.log(`Passed:   ${s.passed}`);
  console.log(`Failed:   ${s.failed}`);
  console.log(`Errors:   ${s.errors}`);
  console.log(`Skipped:  ${s.skipped}`);
  if (s.avgTotalMs !== null) console.log(`Avg time: ${s.avgTotalMs}ms`);
  if (s.avgThroughputTokensPerSec !== null)
    console.log(`Avg throughput: ${s.avgThroughputTokensPerSec} tok/s`);
  console.log(`Live endpoint: ${s.ranAgainstLiveEndpoint}`);

  if (!existsSync(ARTIFACTS_DIR)) {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nReport written to: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Eval harness failed:", err);
  process.exit(1);
});
