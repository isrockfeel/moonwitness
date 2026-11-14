import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { initDb, closeDb, applyMigrations, getDb } from "@moonwitness/orm";
import { authMigrations } from "../../db/migrations";
import { createUser } from "../../services/user";
import { getSessionCookieOptions } from "../../services/session";

const API_PREFIX = "/api/v1";
const ADMIN_USERNAME = "test-admin";
const ADMIN_EMAIL = "test-admin@moon.world";
const ADMIN_PASSWORD = "test-admin-password-2026";

/**
 * Integration tests for the auth route wiring.
 *
 * These exercise the full Fastify stack so they catch problems that unit
 * mocks miss — most notably missing cookie-plugin registration and missing
 * DB-schema initialization.
 */
async function loadApp() {
  const { buildFastify } = await import("../../infrastructure/adapters/fastify.adapter");
  const app = await buildFastify({ prefix: API_PREFIX });
  await app.ready();
  return app;
}

function getSessionCookie(response: { headers: Record<string, unknown> }): string {
  const setCookie = response.headers["set-cookie"];
  const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie ?? "");
  const sessionMatch = cookieStr.match(/mw_session=([^;]+)/);
  if (!sessionMatch) {
    throw new Error("Login response did not set a session cookie");
  }
  return `mw_session=${sessionMatch[1]}`;
}

async function login(app: FastifyInstance, identifier: string, password: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: `${API_PREFIX}/auth/login`,
    payload: { identifier, password },
  });
  if (response.statusCode !== 200) {
    throw new Error(`Test login failed with status ${response.statusCode}`);
  }
  return getSessionCookie(response);
}

describe("auth routes", () => {
  const envBackup = { ...process.env };
  let app: FastifyInstance | null = null;

  beforeEach(async () => {
    process.env = { ...envBackup };
    process.env.NODE_ENV = "test";
    process.env.MW_BOOTSTRAP_ADMIN_USERNAME = ADMIN_USERNAME;
    process.env.MW_BOOTSTRAP_ADMIN_EMAIL = ADMIN_EMAIL;
    process.env.MW_BOOTSTRAP_ADMIN_PASSWORD = ADMIN_PASSWORD;
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
      url: `${API_PREFIX}/auth/login`,
      payload: { identifier: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    const setCookie = login.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
    expect(cookieStr).toContain("mw_session=");
    expect(cookieStr).toMatch(/httponly/i);
    expect(cookieStr).toMatch(/samesite=lax/i);
    expect(login.headers["cache-control"]).toBe("no-store");

    const cookie = getSessionCookie(login);

    const me = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/auth/me`,
      headers: { cookie },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({
      user: expect.objectContaining({ username: ADMIN_USERNAME, role: "admin" }),
    });

    const row = await getDb().get<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE username = ?",
      [ADMIN_USERNAME],
    );
    expect(row?.password_hash).not.toBe(ADMIN_PASSWORD);
    expect(row?.password_hash).toMatch(/^\$2[aby]\$/);
  });

  it("rejects unauthenticated requests without a valid session cookie", async () => {
    app = await loadApp();

    const meWithoutCookie = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/auth/me`,
    });
    expect(meWithoutCookie.statusCode).toBe(401);
    expect(meWithoutCookie.json().error).toBe("Not authenticated");
  });

  it("uses the same generic response for unknown users and incorrect passwords", async () => {
    app = await loadApp();

    const unknownUser = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/login`,
      payload: { identifier: "missing-user", password: ADMIN_PASSWORD },
    });
    const wrongPassword = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/login`,
      payload: { identifier: ADMIN_USERNAME, password: "wrong-password-2026" },
    });

    expect(unknownUser.statusCode).toBe(401);
    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownUser.json()).toEqual(wrongPassword.json());
  });

  it("rejects passwords that exceed bcrypt's supported byte length", async () => {
    app = await loadApp();

    const response = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/login`,
      payload: { identifier: ADMIN_USERNAME, password: "p".repeat(73) },
    });

    expect(response.statusCode).toBe(400);
  });

  it("does not allow a caller-controlled forwarded header to bypass login rate limiting", async () => {
    app = await loadApp();

    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: `${API_PREFIX}/auth/login`,
        remoteAddress: "192.0.2.44",
        headers: { "x-forwarded-for": `198.51.100.${attempt + 1}` },
        payload: { identifier: "missing-user", password: "wrong-password-2026" },
      });
      expect(response.statusCode).toBe(attempt < 10 ? 401 : 429);
    }
  });

  it("rejects expired sessions and revokes sessions on logout", async () => {
    app = await loadApp();
    const cookie = await login(app, ADMIN_USERNAME, ADMIN_PASSWORD);
    const sessionId = cookie.slice("mw_session=".length);

    await getDb().run("UPDATE sessions SET expires_at = ? WHERE id = ?", [
      new Date(0).toISOString(),
      sessionId,
    ]);
    const expired = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/auth/me`,
      headers: { cookie },
    });
    expect(expired.statusCode).toBe(401);

    const activeCookie = await login(app, ADMIN_USERNAME, ADMIN_PASSWORD);
    const logout = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/logout`,
      headers: { cookie: activeCookie },
    });
    expect(logout.statusCode).toBe(200);

    const revoked = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/auth/me`,
      headers: { cookie: activeCookie },
    });
    expect(revoked.statusCode).toBe(401);
  });

  it("marks the session cookie Secure in production", () => {
    process.env.NODE_ENV = "production";

    expect(getSessionCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  });

  it("enforces authenticated role permissions instead of caller-supplied role headers", async () => {
    app = await loadApp();
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const anonymousSpoof = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/control/apply`,
      headers: { "x-actor-id": "1", "x-actor-role": "admin" },
      payload: {},
    });
    expect(anonymousSpoof.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();

    const anonymousReadSpoof = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/control/status`,
      headers: { "x-actor-id": "1", "x-actor-role": "admin" },
    });
    expect(anonymousReadSpoof.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();

    const editor = await createUser({
      username: "test-editor",
      email: "test-editor@moon.world",
      password: "test-editor-password-2026",
      role: "editor",
      displayName: "Test Editor",
    });
    const editorCookie = await login(app, editor.username, "test-editor-password-2026");
    const editorApply = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/control/apply`,
      headers: { cookie: editorCookie, "x-actor-role": "admin" },
      payload: {},
    });
    expect(editorApply.statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();

    const editorWrite = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/control/portforwards`,
      headers: { cookie: editorCookie },
      payload: {},
    });
    expect(editorWrite.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);

    const viewer = await createUser({
      username: "test-viewer",
      email: "test-viewer@moon.world",
      password: "test-viewer-password-2026",
      role: "viewer",
      displayName: "Test Viewer",
    });
    const viewerCookie = await login(app, viewer.username, "test-viewer-password-2026");
    const viewerWrite = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/control/portforwards`,
      headers: { cookie: viewerCookie, "x-actor-role": "admin" },
      payload: {},
    });
    expect(viewerWrite.statusCode).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(1);

    const adminCookie = await login(app, ADMIN_USERNAME, ADMIN_PASSWORD);
    const adminApply = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/control/apply`,
      headers: { cookie: adminCookie },
      payload: {},
    });
    expect(adminApply.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
