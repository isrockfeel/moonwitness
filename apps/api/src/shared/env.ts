import { parseEnv, z } from "@moonwitness/core";

const envSchema = {
  PORT: z.string().default("3002"),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string().optional(),
  /** Comma-separated list of allowed browser origins. Required in production. */
  CORS_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional(),
  /** Max requests per window per client IP. 0 disables rate limiting. */
  RATE_LIMIT_MAX: z.string().default("120"),
  /** Rate-limit window in milliseconds. */
  RATE_LIMIT_WINDOW_MS: z.string().default("60000"),
};

export const env = parseEnv(envSchema);
export type Env = typeof env;

export function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Reject production configuration that is missing required values or relies on
 * insecure development defaults. Returns a list of human-readable problems; an
 * empty list means the configuration is acceptable to boot in production.
 */
export function validateProductionEnv(config: typeof env): string[] {
  if (config.NODE_ENV !== "production") return [];

  const problems: string[] = [];

  if (!config.DATABASE_URL || config.DATABASE_URL.trim() === "") {
    problems.push("DATABASE_URL must be set to a persistent database in production.");
  }
  if (config.DATABASE_URL === ":memory:") {
    problems.push("DATABASE_URL must not be an in-memory database in production.");
  }
  if (!config.CORS_ORIGINS || parseCorsOrigins(config.CORS_ORIGINS).length === 0) {
    problems.push("CORS_ORIGINS must list explicit allowed origins in production.");
  }
  if (config.CORS_ORIGINS && parseCorsOrigins(config.CORS_ORIGINS).includes("*")) {
    problems.push("CORS_ORIGINS must not use '*' in production.");
  }

  return problems;
}

/** Throws when production configuration is unsafe; call once at startup. */
export function assertProductionEnv(config: typeof env): void {
  const problems = validateProductionEnv(config);
  if (problems.length > 0) {
    throw new Error(
      `Insecure or incomplete production configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  }
}
