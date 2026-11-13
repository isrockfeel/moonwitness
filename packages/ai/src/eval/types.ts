/**
 * Evaluation harness types for Issue #35 — RIOT Intelligence model evaluation.
 *
 * Results distinguish measured values from estimates and missing metrics so that
 * hardware/profile reports do not overclaim quality from parameter counts alone.
 */

// ============================================================================
// Metadata
// ============================================================================

export interface HardwareProfile {
  cpu?: string;
  /** "linux" | "win32" | "darwin". */
  os: string;
  arch: string;
  ramMb?: number;
  gpuModel?: string;
  gpuVramMb?: number;
  cpuCores?: number;
}

export interface RuntimeMetadata {
  provider: string;
  runtimeVersion?: string;
  baseUrl: string;
}

export interface ModelEvalMetadata {
  modelId: string;
  quantization?: string;
  contextLength?: number;
  provider: string;
  hardware?: HardwareProfile;
  runtime?: RuntimeMetadata;
  evaluatedAt: string; // ISO-8601
}

// ============================================================================
// Task contract (no private data)
// ============================================================================

/** Privacy-safe fixture task. Never contains PII or production prompts. */
export interface EvalTask {
  id: string;
  /** Human-readable label. */
  label: string;
  /** The user prompt sent to the model. Must be safe / non-sensitive. */
  prompt: string;
  /** System prompt, optional. */
  systemPrompt?: string;
  /** Expected answer shape for deterministic correctness checks. */
  expectedAnswer?: string;
  /** If set, runs a regex match against completion content for PASS/FAIL. */
  expectedPattern?: RegExp;
  /** Whether this task should be skipped in GPU-less smoke mode. */
  requiresGpu?: boolean;
  /** Human-language description of what is being evaluated. */
  description?: string;
}

// ============================================================================
// Result per task run
// ============================================================================

export type TaskOutcome = "pass" | "fail" | "error" | "skipped";

export interface TaskTiming {
  /** Time to first token in ms (null when unavailable). */
  ttftMs: number | null;
  totalMs: number;
}

export interface TaskMetrics {
  timing: TaskTiming;
  /** Actual tokens produced by the model (null if not reported). */
  outputTokens: number | null;
  /** Prompt tokens consumed (null if not reported). */
  inputTokens: number | null;
  /** Total tokens (null if not reported). */
  totalTokens: number | null;
  /** Tokens/s; null when tokens are unavailable. */
  throughputTokensPerSec: number | null;
}

export interface TaskResult {
  taskId: string;
  label: string;
  outcome: TaskOutcome;
  metrics: TaskMetrics;
  model: ModelIdentityRef;
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export interface ModelIdentityRef {
  id: string;
  provider: string;
}

// ============================================================================
// Harness report
// ============================================================================

export interface EvaluationReport {
  /** Machine-readable ID; stable across runs. */
  reportId: string;
  createdAt: string;
  metadata: ModelEvalMetadata;
  tasks: TaskResult[];
  summary: ReportSummary;
}

export interface ReportSummary {
  totalTasks: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  avgTtftMs: number | null;
  avgTotalMs: number | null;
  avgThroughputTokensPerSec: number | null;
  /** null when no numeric metrics were available. */
  totalOutputTokens: number | null;
  totalInputTokens: number | null;
  totalTokens: number | null;
  /** true when at least one real network call was made. */
  ranAgainstLiveEndpoint: boolean;
}
