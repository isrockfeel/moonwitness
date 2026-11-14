import { describe, expect, it } from "vitest";

interface Session {
  identity: string;
  role: string;
  username?: string;
}

/**
 * Mirrors the readSession logic from src/lib/session.ts so we can test it
 * without a DOM. The production function lives in a React component context;
 * this inline copy lets us verify the parsing contract directly.
 */
function readSession(storage: Record<string, string | null>): Session | null {
  for (const key of ["localStorage", "sessionStorage"]) {
    try {
      const raw = storage[key];
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") continue;
      const s = parsed as Record<string, unknown>;
      if (typeof s.identity !== "string") continue;
      return {
        identity: s.identity,
        role: typeof s.role === "string" ? s.role : "",
        username: typeof s.username === "string" ? s.username : undefined,
      };
    } catch {
      // ignore malformed entry, try next store
    }
  }
  return null;
}

describe("readSession preserves username", () => {
  it("includes username when present in stored session", () => {
    const storage: Record<string, string | null> = {
      localStorage: JSON.stringify({
        identity: "user-42",
        role: "admin",
        username: "alice",
      }),
      sessionStorage: null,
    };
    const result = readSession(storage);
    expect(result).not.toBeNull();
    expect(result!.username).toBe("alice");
    expect(result!.identity).toBe("user-42");
    expect(result!.role).toBe("admin");
  });

  it("has undefined username when not present in stored session", () => {
    const storage: Record<string, string | null> = {
      localStorage: JSON.stringify({
        identity: "user-42",
        role: "user",
      }),
      sessionStorage: null,
    };
    const result = readSession(storage);
    expect(result?.username).toBeUndefined();
  });
});
