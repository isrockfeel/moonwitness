import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import FastifyCors from "@fastify/cors";
import { initDb, closeDb, applyMigrations } from "@moonwitness/orm";
import { authMigrations } from "../../db/migrations";

async function loadRoutes(max: string) {
  vi.resetModules();
  process.env.ARSY_AUTH_RATE_MAX = max;
  process.env.ARSY_AUTH_RATE_WINDOW_MS = "60000";
  return import("./control.routes");
}

describe("control routes auth rate limiting", () => {
  const envBackup = { ...process.env };
  let app: FastifyInstance | null = null;

  beforeEach(async () => {
    process.env = { ...envBackup };
    await initDb("file::memory:?cache=shared");
    await applyMigrations(Array.from(authMigrations));
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await closeDb();
  });

  it("menolak permintaan auth setelah batas per-IP terlampaui", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { controlRoutes } = await loadRoutes("2");
    app = Fastify({ logger: false });
    await app.register(controlRoutes);
    await app.ready();
    const inject = () =>
      app!.inject({
        method: "POST",
        url: "/control/auth/login",
        payload: { email: "a@b.c" },
        remoteAddress: "10.1.2.3",
      });
    const first = await inject();
    const second = await inject();
    expect(first.statusCode).toBe(502);
    expect(second.statusCode).toBe(502);
    const third = await inject();
    expect(third.statusCode).toBe(429);
    expect(third.json().message).toContain("terlalu banyak");
  });

  it("mengirim header rate limit pada respons auth", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { controlRoutes } = await loadRoutes("5");
    app = Fastify({ logger: false });
    await app.register(controlRoutes);
    await app.ready();
    const res = await app.inject({
      method: "GET",
      url: "/control/auth/me",
      remoteAddress: "10.9.9.9",
    });
    expect(res.statusCode).toBe(502);
    expect(res.headers["x-ratelimit-limit"]).toBe("5");
    expect(res.headers["x-ratelimit-remaining"]).toBe("4");
  });

  it("tidak membatasi route baca non-auth secara berlebihan", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { controlRoutes } = await loadRoutes("1");
    app = Fastify({ logger: false });
    await app.register(controlRoutes);
    await app.ready();
    for (let i = 0; i < 3; i += 1) {
      const res = await app.inject({
        method: "GET",
        url: "/control/host",
        remoteAddress: "10.5.5.5",
      });
      expect(res.statusCode).not.toBe(429);
    }
  });

  it("allows CORS preflight for DELETE on control routes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { controlRoutes } = await loadRoutes("1");
    app = Fastify({ logger: false });
    await app.register(FastifyCors, {
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    });
    await app.register(controlRoutes);
    await app.ready();
    const deletePreflight = await app.inject({
      method: "OPTIONS",
      url: "/control/portforwards",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "DELETE",
        "access-control-request-headers": "content-type",
      },
    });
    expect([200, 204]).toContain(deletePreflight.statusCode);
    expect(deletePreflight.headers["access-control-allow-methods"]).toContain("DELETE");
  });
});
