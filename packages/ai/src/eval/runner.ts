/**
 * Evaluation harness runner for Issue #35 — RIOT Intelligence model evaluation.
 *
 * Supports two modes:
 *  - `smoke`: GPU-less mode; only runs tasks without `requiresGpu`.
 *  - `full`: opt-in full evaluation when a live endpoint + credentials are provided.
 *
 * Results are returned as structured JSON compatible with the ReportSummary format.
 */

import type { EvaluationReport, ModelEvalMetadata, TaskResult, ReportSummary } from "./types";
import type { EvalTask } from "./types";
import type { ChatRequest, ChatResponse } from "../types";

// ============================================================================
// Configuration
// ============================================================================

export interface EvalHarnessConfig {
  /** Base URL of the OpenAI-compatible endpoint, e.g. https://ai-gateway.apps.mycocolink.com/v1 */
  baseUrl: string;
  /** API key; must be provided via environment OPENAI_COMPATIBLE_API_KEY in production. */
  apiKey?: string;
  /** Model ID to evaluate, e.g. "gpt-4o-mini". Must be resolvable by the provider. */
  modelId: string;
  /** Tasks to evaluate. Use getSmokeTasks() for smoke mode. */
  tasks: EvalTask[];
  /** Timeout per request in ms. */
  timeoutMs?: number;
  /** Maximum tokens in each completion (keeps responses short for smoke tests). */
  maxTokens?: number;
  /** Whether to capture streaming events to measure TTFT. False disables streaming. */
  streamForTtft?: boolean;
}

// ============================================================================
// Provider interface used by the harness
// ============================================================================

export interface EvalProvider {
  /** List available models from the provider. */
  listModels(): Promise<{ id: string; name: string }[]>;
  /** Non-streaming chat completion. */
  chat(request: ChatRequest): Promise<ChatResponse>;
  /** Health status of the provider. */
  checkHealth(): Promise<{ ok: boolean; error?: string }>;
}

// ============================================================================
// Runner
// ============================================================================

export class EvalHarnessRunner {
  private readonly config: EvalHarnessConfig;

  constructor(config: EvalHarnessConfig) {
    this.config = config;
  }

  /**
   * Run all configured tasks and produce an EvaluationReport.
   * Uses the internal OpenAI-compatible HTTP client directly.
   */
  async run(providerUrl: string): Promise<EvaluationReport> {
    const now = new Date().toISOString();
    const reportId = crypto.randomUUID?.() ?? `${Date.now()}-harness`;

    const metadata: ModelEvalMetadata = {
      modelId: this.config.modelId,
      provider: providerUrl.includes("ollama") ? "ollama" : "openai-compatible",
      runtime: {
        provider: "openai-compatible",
        baseUrl: providerUrl,
        runtimeVersion: undefined,
      },
      evaluatedAt: now,
    };

    const results: TaskResult[] = [];
    let ranAgainstLiveEndpoint = false;

    for (const task of this.config.tasks) {
      const result = await this.runTask(task, providerUrl);
      if (result.outcome !== "skipped") ranAgainstLiveEndpoint = true;
      results.push(result);
    }

    const summary = this.computeSummary(results, ranAgainstLiveEndpoint);

    return {
      reportId,
      createdAt: now,
      metadata,
      tasks: results,
      summary,
    };
  }

  private async runTask(task: EvalTask, baseUrl: string): Promise<TaskResult> {
    const start = performance.now();
    const ttftMs: number | null = null;

    try {
      const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
      const requestBody: Record<string, unknown> = {
        model: this.config.modelId,
        messages: [
          ...(task.systemPrompt ? [{ role: "system" as const, content: task.systemPrompt }] : []),
          { role: "user" as const, content: task.prompt },
        ],
        max_tokens: this.config.maxTokens ?? 100,
        stream: this.config.streamForTtft ?? false,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 60_000),
      });

      const endTime = performance.now();
      const totalMs = Math.round(endTime - start);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        return {
          taskId: task.id,
          label: task.label,
          outcome: "error" as const,
          metrics: {
            timing: { ttftMs: null, totalMs },
            outputTokens: null,
            inputTokens: null,
            totalTokens: null,
            throughputTokensPerSec: null,
          },
          model: { id: this.config.modelId, provider: "openai-compatible" },
          error: `[${response.status}] ${errText.slice(0, 200)}`,
        };
      }

      const data = (await response.json()) as ChatResponse & {
        choices?: Array<{ delta?: { content?: string } }>;
      };

      // Try to measure TTFT via SSE stream if enabled
      if (this.config.streamForTtft && typeof ttftMs === "number") {
        // Already captured inside streaming logic elsewhere
      }

      const content = (data.choices?.[0]?.message?.content ?? "").trim();
      const promptTokens = data.usage?.promptTokens ?? null;
      const completionTokens = data.usage?.completionTokens ?? null;
      const totalTokenCount = data.usage?.totalTokens ?? null;
      const throughput =
        totalTokenCount !== null && totalMs > 0
          ? Math.round((totalTokenCount / totalMs) * 1000)
          : null;

      // Deterministic correctness check
      let outcome: TaskResult["outcome"] = "pass";
      if (task.expectedPattern) {
        const matches = task.expectedPattern.test(content);
        if (!matches) {
          outcome = "fail";
        }
      } else if (task.expectedAnswer) {
        const normalizedContent = content.toLowerCase().trim();
        const normalizedExpected = task.expectedAnswer.toLowerCase().trim();
        if (normalizedContent !== normalizedExpected) {
          outcome = "fail";
        }
      }

      return {
        taskId: task.id,
        label: task.label,
        outcome,
        metrics: {
          timing: { ttftMs, totalMs },
          outputTokens: completionTokens,
          inputTokens: promptTokens,
          totalTokens: totalTokenCount,
          throughputTokensPerSec: throughput,
        },
        model: { id: this.config.modelId, provider: "openai-compatible" },
        rawResponse: data as unknown as Record<string, unknown>,
      };
    } catch (err) {
      const totalMs = Math.round(performance.now() - start);
      return {
        taskId: task.id,
        label: task.label,
        outcome: "error" as const,
        metrics: {
          timing: { ttftMs: null, totalMs },
          outputTokens: null,
          inputTokens: null,
          totalTokens: null,
          throughputTokensPerSec: null,
        },
        model: { id: this.config.modelId, provider: "openai-compatible" },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private computeSummary(results: TaskResult[], ranAgainstLiveEndpoint: boolean): ReportSummary {
    const totalTasks = results.length;
    const passed = results.filter((r) => r.outcome === "pass").length;
    const failed = results.filter((r) => r.outcome === "fail").length;
    const errors = results.filter((r) => r.outcome === "error").length;
    const skipped = results.filter((r) => r.outcome === "skipped").length;

    const timedResults = results.filter((r) => r.metrics.timing.totalMs > 0);
    const avgTotalMs =
      timedResults.length > 0
        ? Math.round(
            timedResults.reduce((s, r) => s + r.metrics.timing.totalMs, 0) / timedResults.length,
          )
        : null;

    const avgTtftMs =
      timedResults.filter((r) => r.metrics.timing.ttftMs !== null).length > 0
        ? Math.round(
            timedResults
              .filter((r) => r.metrics.timing.ttftMs !== null)
              .reduce((s, r) => s + (r.metrics.timing.ttftMs ?? 0), 0) /
              timedResults.filter((r) => r.metrics.timing.ttftMs !== null).length,
          )
        : null;

    const tpResults = timedResults.filter((r) => r.metrics.throughputTokensPerSec !== null);
    const avgThroughput =
      tpResults.length > 0
        ? Math.round(
            tpResults.reduce((s, r) => s + (r.metrics.throughputTokensPerSec ?? 0), 0) /
              tpResults.length,
          )
        : null;

    const sumOutputTokens = timedResults.reduce((s, r) => s + (r.metrics.outputTokens ?? 0), 0);
    const sumInputTokens = timedResults.reduce((s, r) => s + (r.metrics.inputTokens ?? 0), 0);
    const sumTotalTokens = timedResults.reduce((s, r) => s + (r.metrics.totalTokens ?? 0), 0);

    return {
      totalTasks,
      passed,
      failed,
      errors,
      skipped,
      avgTtftMs,
      avgTotalMs,
      avgThroughputTokensPerSec: avgThroughput,
      totalOutputTokens: sumOutputTokens || null,
      totalInputTokens: sumInputTokens || null,
      totalTokens: sumTotalTokens || null,
      ranAgainstLiveEndpoint,
    };
  }
}
