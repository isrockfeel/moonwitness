/**
 * Smoke-test harness for Issue #35 — runs without GPU.
 * Skipped entirely unless EVAL_SMOKE=1 is set.
 */

import { describe, it, expect } from "vitest";
import { FIXTURE_TASKS, getSmokeTasks } from "./fixtures";
import { EvalHarnessRunner } from "./runner";

const SMOKE_ENABLED = process.env.EVAL_SMOKE === "1";
describe(SMOKE_ENABLED ? "Eval Harness (smoke)" : "Eval Harness (smoke) [skipped]", () => {
  it("should include only non-gpu tasks in smoke mode", () => {
    const smoke = getSmokeTasks();
    expect(smoke.length).toBeGreaterThan(0);
    for (const t of smoke) {
      expect(t.requiresGpu).toBeFalsy();
    }
  });

  it("should preserve fixture task ids", () => {
    const ids = FIXTURE_TASKS.map((t) => t.id);
    expect(ids).toContain("simple-addition");
    expect(ids).toContain("detect-language-simple");
    expect(ids).toContain("basic-reasoning-chain");
  });

  if (!SMOKE_ENABLED) return;

  it("should run through a live endpoint when configured", async () => {
    const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
    const modelId = process.env.OPENAI_COMPATIBLE_MODEL ?? "gpt-4o-mini";
    const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;

    if (!baseUrl) {
      // In CI, we rely on mocking; locally user sets the URL
      console.warn("[harness] OPENAI_COMPATIBLE_BASE_URL not set — skipping live run");
      return;
    }

    const runner = new EvalHarnessRunner({
      baseUrl,
      apiKey,
      modelId,
      tasks: getSmokeTasks(),
      timeoutMs: 30_000,
      maxTokens: 50,
    });

    const report = await runner.run(baseUrl);

    // Basic structural assertions
    expect(report.tasks.length).toBeGreaterThan(0);
    expect(report.summary.totalTasks).toBe(getSmokeTasks().length);

    for (const task of report.tasks) {
      expect(["pass", "fail", "error", "skipped"]).toContain(task.outcome);
      expect(task.metrics.timing.totalMs).toBeGreaterThanOrEqual(0);
    }

    // At least one task should succeed or fail (not all errors)
    const passedOrFailed = report.tasks.filter((t) => t.outcome === "pass" || t.outcome === "fail");
    expect(passedOrFailed.length).toBeGreaterThan(0);
  });
});
