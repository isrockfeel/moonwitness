import { describe, expect, it } from "vitest";
import { createAuthPayload, signJwt, signToken, verifyJwt, verifyToken } from "./index";

describe("jwt utilities", () => {
  const secret = "super-secret-key-that-is-at-least-32-chars-long";

  it("creates a structured auth payload", () => {
    const payload = createAuthPayload("usr_123", "alice", {
      role: "admin",
      artworkId: "art_456",
      artworkKey: "hero-witness",
    });

    expect(payload).toEqual({
      userId: "usr_123",
      username: "alice",
      role: "admin",
      artworkId: "art_456",
      artworkKey: "hero-witness",
    });
  });

  it("signs and verifies JWT tokens with matching secret", async () => {
    const payload = createAuthPayload("usr_999", "shadow_operative", {
      role: "user",
    });

    const token = await signJwt(payload, secret);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const verified = await verifyJwt(token, secret);
    expect(verified.success).toBe(true);
    expect(verified.payload?.userId).toBe("usr_999");
    expect(verified.payload?.username).toBe("shadow_operative");
    expect(verified.payload?.role).toBe("user");
  });

  it("supports signToken and verifyToken contract aliases", async () => {
    const payload = createAuthPayload("usr_contract", "contract_witness");

    const token = await signToken(payload, secret);
    const verified = await verifyToken(token, secret);

    expect(verified.success).toBe(true);
    expect(verified.payload?.userId).toBe("usr_contract");
    expect(verified.payload?.username).toBe("contract_witness");
  });

  it("fails verification when given the wrong secret", async () => {
    const payload = createAuthPayload("usr_secure", "tamper_target");
    const token = await signJwt(payload, secret);

    const result = await verifyJwt(token, "wrong-secret-key-that-is-also-long-enough");
    expect(result.success).toBe(false);
    expect(result.payload).toBeUndefined();
    expect(result.error).toBeDefined();
  });

  it("fails verification for corrupted tokens", async () => {
    const result = await verifyJwt("not.a.valid.jwt.token", secret);
    expect(result.success).toBe(false);
    expect(result.payload).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});
