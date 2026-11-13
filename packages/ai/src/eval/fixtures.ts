/**
 * Privacy-safe evaluation fixture tasks for Issue #35.
 *
 * These prompts contain no PII, production content, or sensitive domain data.
 * They exercise different capabilities: reasoning, code, creativity, constraint.
 */

import type { EvalTask } from "./types";

export const FIXTURE_TASKS: EvalTask[] = [
  {
    id: "simple-addition",
    label: "Simple addition",
    prompt: "What is 1 + 1? Reply with just the number.",
    systemPrompt: "You are a helpful math assistant. Answer concisely.",
    expectedPattern: /^2\s*$/mu,
    description:
      "Deterministic arithmetic check; should always pass if the endpoint responds normally.",
  },
  {
    id: "identity-keep-short",
    label: "Identity - keep short",
    prompt: "Reply with exactly two words: 'I understand'. Do not add anything else.",
    expectedPattern: /^I understand\s*$/mu,
    description: "Tests constraint-following and refusal to add extra text.",
  },
  {
    id: "detect-language-simple",
    label: "Detect language (simple)",
    prompt:
      'Classify this sentence as either "english" or "spanish": "The cat sits on the mat." Output only the category.',
    expectedPattern: /^english\s*$/mu,
    description: "Lightweight classification task suitable for smoke mode without GPU.",
  },
  {
    id: "basic-reasoning-chain",
    label: "Basic reasoning chain",
    prompt:
      "If all Bloops are Bazzes, and all Bazzes are Laps, are all Bloops Laps? Reply with yes or no only.",
    expectedPattern: /^yes\s*$/mu,
    description: "Simple syllogism that tests chained-reason capability.",
  },
  {
    id: "safe-code-sample",
    label: "Safe code sample",
    prompt:
      "Write a Python function named `square` that returns the square of its input argument `x`. Include a one-line docstring.",
    expectedPattern: /def square\(x\):/mu,
    description: "Code-generation smoke test using a trivial, safe snippet.",
  },
  {
    id: "creative-short-poem",
    label: "Creative short poem",
    prompt: "Write a three-line haiku about debugging software. Do not include quotes.",
    expectedPattern: /^.{5,90}$/m,
    requiresGpu: true,
    description:
      "Creative-writing task best run against a live model after GPU availability is confirmed.",
  },
];

/** Return tasks suitable for smoke testing (no GPU required). */
export function getSmokeTasks(): EvalTask[] {
  return FIXTURE_TASKS.filter((t) => !t.requiresGpu);
}
