import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Rate limiting di control.routes dikonfigurasi dari env saat modul dimuat,
// jadi modul harus di-import ulang per skenario dengan env berbeda.
async function loadRoutes(max: string) {
  vi.resetModules();
  process.env.ARSY_AUTH_RATE_MAX = max;
  process.env.ARSY_AUTH_RATE_WINDOW_MS = "60000";
  return import("./control.routes");
}

// Fastify minimal stub: hanya merekam handler agar bisa dipanggil langsung.
function makeStub() {
  const handlers = new Map<string, (req: unknown, reply: unknown) => Promise<unknown>>();
  const fastify = {
    get: (path: string, handler: never) => handlers.set(`GET ${path}`, handler),
    post: (path: string, handler: never) => handlers.set(`POST ${path}`, handler),
    delete: (path: string, handler: never) => handlers.set(`DELETE ${path}`, handler),
    put: (path: string, handler: never) => handlers.set(`PUT ${path}`, handler),
  };
  return { fastify, handlers };
}

function makeReply() {
  const state: { code?: number; body?: unknown; headers: Record<string, unknown> } = {
    headers: {},
  };
  const reply = {
    code(n: number) {
      state.code = n;
      return reply;
    },
    header(k: string, v: unknown) {
      state.headers[k] = v;
      return reply;
    },
    send(body: unknown) {
      state.body = body;
      return reply;
    },
  };
  return { reply, state };
}

describe("control routes auth rate limiting", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = { ...envBackup };
    vi.restoreAllMocks();
  });

  it("menolak permintaan auth setelah batas per-IP terlampaui", async () => {
    const { controlRoutes } = await loadRoutes("2");
    const { fastify, handlers } = makeStub();
    await controlRoutes(fastify as never);

    const handler = handlers.get("POST /control/auth/:path");
    expect(handler).toBeDefined();

    // Upstream tidak tersedia -> forwardAuth mengembalikan 502, bukan 429.
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const request = {
      params: { path: "login" },
      method: "POST",
      url: "/api/v1/control/auth/login",
      headers: {},
      ip: "10.1.2.3",
      protocol: "http",
      log: { warn: vi.fn() },
      body: { email: "a@b.c" },
    };

    for (const expected of [502, 502]) {
      const { reply, state } = makeReply();
      await handler!(request, reply);
      expect(state.code).toBe(expected);
    }

    // Permintaan ketiga melewati kuota -> 429 dan tidak memanggil upstream lagi.
    const { reply, state } = makeReply();
    await handler!(request, reply);
    expect(state.code).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("mengirim header x-ratelimit pada respons auth", async () => {
    const { controlRoutes } = await loadRoutes("5");
    const { fastify, handlers } = makeStub();
    await controlRoutes(fastify as never);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const handler = handlers.get("GET /control/auth/:path")!;
    const request = {
      params: { path: "me" },
      method: "GET",
      url: "/api/v1/control/auth/me",
      headers: {},
      ip: "10.9.9.9",
      protocol: "http",
      log: { warn: vi.fn() },
    };
    const { reply, state } = makeReply();
    await handler(request, reply);
    expect(state.headers["x-ratelimit-limit"]).toBe(5);
    expect(state.headers["x-ratelimit-remaining"]).toBe(4);
  });
});
