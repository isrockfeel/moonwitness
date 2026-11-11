import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./index";

describe("password utilities", () => {
  it("hashes password into salt:key hex format", async () => {
    const rawPassword = "correct-horse-battery-staple";
    const hashed = await hashPassword(rawPassword);

    expect(typeof hashed).toBe("string");
    const parts = hashed.split(":");
    expect(parts).toHaveLength(2);

    const [salt, key] = parts;
    expect(salt).toBeDefined();
    expect(key).toBeDefined();
    // Salt is 16 bytes = 32 hex chars; key is 64 bytes = 128 hex chars
    expect(salt?.length).toBe(32);
    expect(key?.length).toBe(128);
    expect(/^[0-9a-f]+$/i.test(salt!)).toBe(true);
    expect(/^[0-9a-f]+$/i.test(key!)).toBe(true);
  });

  it("verifies a matching password successfully", async () => {
    const password = "ultra-secure-passphrase-2026";
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const password = "original-password";
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword("wrong-password", hash);
    expect(isMatch).toBe(false);
  });

  it("generates unique salts and hashes for the same password", async () => {
    const password = "identical-password";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);

    const [salt1] = hash1.split(":");
    const [salt2] = hash2.split(":");
    expect(salt1).not.toBe(salt2);

    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it("returns false for malformed or corrupted hashes", async () => {
    expect(await verifyPassword("password", "")).toBe(false);
    expect(await verifyPassword("password", "no-delimiter")).toBe(false);
    expect(await verifyPassword("password", "a:b:c")).toBe(false);
    expect(await verifyPassword("password", ":key")).toBe(false);
    expect(await verifyPassword("password", "salt:")).toBe(false);
    expect(await verifyPassword("password", "deadbeef:1234")).toBe(false);
  });
});
