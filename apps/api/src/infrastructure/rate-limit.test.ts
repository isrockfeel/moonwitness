import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit.js";

describe("createRateLimiter", () => {
  it("allows up to max requests then blocks within the window", () => {
    let t = 1000;
    const limiter = createRateLimiter({ windowMs: 1000, max: 3, now: () => t });

    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").remaining).toBe(0);
    const blocked = limiter.check("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(false);
    t = 1001;
    expect(limiter.check("ip").allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("can reset a single key or all keys", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    limiter.check("a");
    limiter.check("b");
    limiter.reset("a");
    expect(limiter.check("a").allowed).toBe(true);
    limiter.reset();
    expect(limiter.size()).toBe(0);
  });
});
