import { describe, expect, it } from "vitest";
import { assertProductionEnv, parseCorsOrigins, validateProductionEnv } from "./env.js";

const base = {
  PORT: "3002",
  HOST: "127.0.0.1",
  API_PREFIX: "/api/v1",
  NODE_ENV: "production" as const,
  DATABASE_URL: "file:/var/lib/moonwitness/app.db",
  CORS_ORIGINS: "https://moonwitness.example",
  LOG_LEVEL: undefined,
};

describe("parseCorsOrigins", () => {
  it("splits, trims and drops empty entries", () => {
    expect(parseCorsOrigins("https://a.test, https://b.test ,, ")).toEqual([
      "https://a.test",
      "https://b.test",
    ]);
    expect(parseCorsOrigins(undefined)).toEqual([]);
  });
});

describe("validateProductionEnv", () => {
  it("accepts a fully specified production config", () => {
    expect(validateProductionEnv(base)).toEqual([]);
  });

  it("ignores non-production environments", () => {
    expect(
      validateProductionEnv({ ...base, NODE_ENV: "development", DATABASE_URL: undefined }),
    ).toEqual([]);
  });

  it("rejects a missing or in-memory database", () => {
    expect(validateProductionEnv({ ...base, DATABASE_URL: undefined })).toContain(
      "DATABASE_URL must be set to a persistent database in production.",
    );
    expect(validateProductionEnv({ ...base, DATABASE_URL: ":memory:" })).toContain(
      "DATABASE_URL must not be an in-memory database in production.",
    );
  });

  it("rejects missing, empty or wildcard CORS origins", () => {
    expect(validateProductionEnv({ ...base, CORS_ORIGINS: undefined })).toContain(
      "CORS_ORIGINS must list explicit allowed origins in production.",
    );
    expect(validateProductionEnv({ ...base, CORS_ORIGINS: "  " })).toContain(
      "CORS_ORIGINS must list explicit allowed origins in production.",
    );
    expect(validateProductionEnv({ ...base, CORS_ORIGINS: "*" })).toContain(
      "CORS_ORIGINS must not use '*' in production.",
    );
  });

  it("assertProductionEnv throws with actionable detail on unsafe config", () => {
    expect(() => assertProductionEnv({ ...base, DATABASE_URL: undefined })).toThrow(
      /Insecure or incomplete production configuration/,
    );
    expect(() => assertProductionEnv(base)).not.toThrow();
  });
});
