import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import FastifyCors from "@fastify/cors";

async function loadRoutes(max: string) {
  vi.resetModules();
  process.env.ARSY_AUTH_RATE_MAX = max;
  process.env.ARSY_AUTH_RATE_WINDOW_MS = "60000";
  return import("./control.routes");
}

describe("control routes auth rate limiting", () => {
  const envBackup = { ...process.env };
  let app: FastifyInstance | null = null;

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("menolak permintaan auth setelah batas per-IP terlampaui", async () => {
    // Upstream arsy tidak tersedia -> forwardAuth berakhir 502, bukan 429.
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

    // Route di luar scope auth tetap dijangkau berulang tanpa 429.
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

  it("memakai token admin untuk operasi tulis tanpa sesi", async () => {
    process.env.ARSY_TOKEN_READONLY = "readonly-token";
    process.env.ARSY_TOKEN_ADMIN = "admin-token";
    process.env.ARSY_PROXY_ADMIN = "1";
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const { controlRoutes } = await loadRoutes("10");
    app = Fastify({ logger: false });
    await app.register(controlRoutes);
    await app.ready();

    // Gate memanggil /v1/auth/me dan /v1/setup/status; keduanya harus ok.
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: "1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await app.inject({
      method: "POST",
      url: "/control/plan",
      payload: { action: "deploy" },
      remoteAddress: "10.7.7.7",
    });
    expect(res.statusCode).toBe(200);

    // Cari panggilan fetch ke /v1/plan dan pastikan memakai token admin.
    const planCall = fetch.mock.calls.find(([url]) => String(url).includes("/v1/plan"));
    expect(planCall).toBeDefined();
    const headers = planCall![1] as { headers: Record<string, string> };
    expect(headers.headers.authorization).toBe("Bearer admin-token");
  });

  it("memakai token read-only untuk operasi baca tanpa sesi", async () => {
    process.env.ARSY_TOKEN_READONLY = "readonly-token";
    process.env.ARSY_TOKEN_ADMIN = "admin-token";
    process.env.ARSY_PROXY_ADMIN = "1";
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const { controlRoutes } = await loadRoutes("10");
    app = Fastify({ logger: false });
    await app.register(controlRoutes);
    await app.ready();

    // Gate memanggil /v1/auth/me dan /v1/setup/status; keduanya harus ok.
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: "1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await app.inject({
      method: "GET",
      url: "/control/host",
      remoteAddress: "10.8.8.8",
    });
    expect(res.statusCode).toBe(200);

    // Cari panggilan fetch ke /v1/host dan pastikan memakai token read-only.
    const hostCall = fetch.mock.calls.find(([url]) => String(url).includes("/v1/host"));
    expect(hostCall).toBeDefined();
    const headers = hostCall![1] as { headers: Record<string, string> };
    expect(headers.headers.authorization).toBe("Bearer readonly-token");
  });
});
