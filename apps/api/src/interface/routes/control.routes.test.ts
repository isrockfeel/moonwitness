import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";

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
});
