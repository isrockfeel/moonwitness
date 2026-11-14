import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { initDb, closeDb, applyMigrations } from "@moonwitness/orm";
import { authMigrations } from "../../db/migrations";

/**
 * Integration tests for the auth route wiring.
 *
 * These exercise the full Fastify stack so they catch problems that unit
 * mocks miss — most notably missing cookie-plugin registration and missing
 * DB-schema initialization.
 */
async function loadApp() {
  const { buildFastify } = await import("../../infrastructure/adapters/fastify.adapter");
  const { authRoutes } = await import("./auth.routes");
  const app = await buildFastify({});
  await app.register(authRoutes);
  await app.ready();
  return app;
}

describe("auth routes", () => {
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

  it("sets a cookie after successful login and allows subsequent authenticated requests", async () => {
    app = await loadApp();

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { identifier: "admin", password: "admin123" },
    });
    expect(login.statusCode).toBe(200);
    const setCookie = login.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
    expect(cookieStr).toContain("mw_session=");

    // The session cookie must be readable on the next request.
    const sessionMatch = cookieStr.match(/mw_session=([^;]+)/);
    expect(sessionMatch).not.toBeNull();
    const sessionId = sessionMatch![1]!;

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { cookie: `mw_session=${sessionId}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({
      user: expect.objectContaining({ username: "admin", role: "admin" }),
    });
  });

  it("rejects unauthenticated requests without a valid session cookie", async () => {
    app = await loadApp();

    const meWithoutCookie = await app.inject({
      method: "GET",
      url: "/auth/me",
    });
    expect(meWithoutCookie.statusCode).toBe(401);
    expect(meWithoutCookie.json().error).toBe("Not authenticated");
  });
});
