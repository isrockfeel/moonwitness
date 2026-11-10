import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";
import { formatDate, formatNumber, slugify } from "./format";
import { err, ok } from "./result";
import { z } from "zod";

describe("parseEnv", () => {
  it("parses valid env and applies defaults", () => {
    const env = parseEnv(
      { APP_NAME: z.string().default("moonwitness"), PORT: z.coerce.number().default(3000) },
      {},
    );
    expect(env.APP_NAME).toBe("moonwitness");
    expect(env.PORT).toBe(3000);
  });

  it("throws a readable error for invalid env", () => {
    expect(() => parseEnv({ PORT: z.coerce.number() }, { PORT: "abc" })).toThrow(
      /Invalid environment variables/,
    );
  });
});

describe("format", () => {
  it("slugify normalizes text", () => {
    expect(slugify("  Héllo, World!  ")).toBe("hello-world");
  });

  it("formatNumber groups thousands", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formatDate renders a stable date", () => {
    expect(
      formatDate("2026-01-15T00:00:00Z", "en-US", { dateStyle: "medium", timeZone: "UTC" }),
    ).toBe("Jan 15, 2026");
  });
});

describe("Result", () => {
  it("ok carries a value", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });

  it("err carries an error", () => {
    const result = err(new Error("boom"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("boom");
  });
});
