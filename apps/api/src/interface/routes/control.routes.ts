import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";

const ARSY_URL = process.env.ARSY_URL ?? "http://127.0.0.1:8787";
const ARSY_TOKEN_READONLY = process.env.ARSY_TOKEN_READONLY ?? "";
const ARSY_TOKEN_ADMIN = process.env.ARSY_TOKEN_ADMIN ?? "";
const ARSY_PROXY_ADMIN = process.env.ARSY_PROXY_ADMIN === "1";

// Endpoint auth/setup meneruskan kredensial ke control plane, jadi dibatasi
// per-IP untuk mempersempit brute force (login) dan penyalahgunaan setup.
const AUTH_RATE_MAX = Number(process.env.ARSY_AUTH_RATE_MAX ?? "30");
const AUTH_RATE_WINDOW_MS = Number(process.env.ARSY_AUTH_RATE_WINDOW_MS ?? "60000");

// Hanya endpoint arsy yang dikenal yang boleh diproxy. Ini mencegah web
// menjadi open proxy ke apa pun yang kebetulan listen di ARSY_URL.
const READ_PATHS = new Set([
  "health",
  "host",
  "capabilities",
  "metrics",
  "state",
  "resources",
  "logs",
  "audit",
  "users",
  "dns",
]);

const WRITE_PATHS = new Set(["plan", "apply", "ops/plan", "ops"]);

// Endpoint onboarding/auth memakai cookie sesi, bukan token server-side.
const SETUP_PATHS = new Set(["status", "superuser"]);
const AUTH_PATHS = new Set(["login", "logout", "me"]);

function clientIp(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return request.ip;
}

function upstreamHeaders(request: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "x-forwarded-for": clientIp(request),
    "x-forwarded-proto": request.protocol,
  };
  if (request.body) headers["content-type"] = "application/json";
  const cookie = request.headers.cookie;
  if (typeof cookie === "string" && cookie.length > 0) headers.cookie = cookie;
  return headers;
}

function forwardCookies(reply: FastifyReply, upstream: Response) {
  for (const cookie of upstream.headers.getSetCookie()) {
    // Buang atribut Domain agar cookie menempel ke host web, bukan host arsy.
    reply.header("set-cookie", cookie.replace(/;\s*domain=[^;]*/gi, ""));
  }
}

async function forwardAuth(request: FastifyRequest, reply: FastifyReply, subPath: string) {
  const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
  const target = `${ARSY_URL}/v1/${subPath}${query}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: upstreamHeaders(request),
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    request.log.warn({ err: error, target }, "arsy tidak dapat dihubungi");
    return reply.code(502).send({ error: "arsy tidak dapat dihubungi", reachable: false });
  }

  const text = await upstream.text();
  forwardCookies(reply, upstream);
  return reply
    .code(upstream.status)
    .header("content-type", "application/json; charset=utf-8")
    .header("cache-control", "no-store")
    .send(text);
}

// gate memastikan data control hanya keluar setelah onboarding selesai dan
// pemanggil punya sesi. Sebelum initialized, wizard masih boleh lewat.
async function gate(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const headers = upstreamHeaders(request);
  try {
    const me = await fetch(`${ARSY_URL}/v1/auth/me`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    });
    if (me.ok) return true;

    const status = await fetch(`${ARSY_URL}/v1/setup/status`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    });
    if (!status.ok) {
      reply.code(502).send({ error: "arsy tidak dapat dihubungi", reachable: false });
      return false;
    }
    const payload = (await status.json()) as { initialized?: boolean };
    if (!payload.initialized) return true;

    reply.code(401).send({ error: "butuh login", initialized: true });
    return false;
  } catch {
    reply.code(502).send({ error: "arsy tidak dapat dihubungi", reachable: false });
    return false;
  }
}

async function forward(request: FastifyRequest, reply: FastifyReply, subPath: string) {
  const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
  const target = `${ARSY_URL}/v1/${subPath}${query}`;

  // Data control diteruskan dengan cookie sesi pengguna. Token server-side
  // hanya dipakai bila pemanggil tidak membawa sesi (integrasi non-manusia).
  const headers = upstreamHeaders(request);
  if (!headers.cookie) {
    const fallback = ARSY_TOKEN_READONLY || ARSY_TOKEN_ADMIN;
    if (!fallback) {
      return reply.code(401).send({ error: "butuh login" });
    }
    headers.authorization = `Bearer ${fallback}`;
  }

  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    request.log.warn({ err: error, target }, "arsy tidak dapat dihubungi");
    return reply.code(502).send({ error: "arsy tidak dapat dihubungi" });
  }

  const text = await response.text();
  forwardCookies(reply, response);
  return reply
    .code(response.status)
    .header("content-type", "application/json; charset=utf-8")
    .header("cache-control", "no-store")
    .send(text);
}

export async function controlRoutes(fastify: FastifyInstance) {
  // Endpoint auth/setup meneruskan kredensial ke control plane, jadi dipisah
  // ke scope sendiri dengan @fastify/rate-limit per-IP (brute-force guard).
  await fastify.register(async (authScope) => {
    await authScope.register(rateLimit, {
      max: AUTH_RATE_MAX,
      timeWindow: AUTH_RATE_WINDOW_MS,
      keyGenerator: (request) => clientIp(request as FastifyRequest),
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: "Too Many Requests",
        message: "terlalu banyak percobaan; coba lagi nanti",
      }),
    });

    authScope.get<{ Params: { path: string } }>("/control/setup/:path", async (request, reply) => {
      const { path } = request.params;
      if (!SETUP_PATHS.has(path)) {
        return reply.code(404).send({ error: `path setup tidak dikenal: ${path}` });
      }
      return forwardAuth(request, reply, `setup/${path}`);
    });

    authScope.post<{ Params: { path: string } }>("/control/setup/:path", async (request, reply) => {
      const { path } = request.params;
      if (!SETUP_PATHS.has(path)) {
        return reply.code(404).send({ error: `path setup tidak dikenal: ${path}` });
      }
      return forwardAuth(request, reply, `setup/${path}`);
    });

    authScope.get<{ Params: { path: string } }>("/control/auth/:path", async (request, reply) => {
      const { path } = request.params;
      if (!AUTH_PATHS.has(path)) {
        return reply.code(404).send({ error: `path auth tidak dikenal: ${path}` });
      }
      return forwardAuth(request, reply, `auth/${path}`);
    });

    authScope.post<{ Params: { path: string } }>("/control/auth/:path", async (request, reply) => {
      const { path } = request.params;
      if (!AUTH_PATHS.has(path)) {
        return reply.code(404).send({ error: `path auth tidak dikenal: ${path}` });
      }
      return forwardAuth(request, reply, `auth/${path}`);
    });
  });

  fastify.get("/control/status", async (request, reply) => {
    if (!(await gate(request, reply))) return reply;

    const headers = upstreamHeaders(request);
    const [hostRes, metricsRes] = await Promise.all([
      fetch(`${ARSY_URL}/v1/host`, { headers, signal: AbortSignal.timeout(5_000) }).catch(
        () => null,
      ),
      fetch(`${ARSY_URL}/v1/metrics`, { headers, signal: AbortSignal.timeout(10_000) }).catch(
        () => null,
      ),
    ]);

    if (!hostRes?.ok || !metricsRes?.ok) {
      return reply
        .code(502)
        .send({ error: "arsy tidak dapat dihubungi", arsyUrl: ARSY_URL, reachable: false });
    }
    return reply.send({
      reachable: true,
      host: await hostRes.json(),
      metrics: await metricsRes.json(),
    });
  });

  // ---- Port forwarding (dinasih agar tidak ada kesalahan rute /control/:path di bawah)
  fastify.get("/control/portforwards", async (request, reply) => {
    if (!(await gate(request, reply))) return reply;
    return forward(request, reply, "portforwards");
  });

  fastify.post("/control/portforwards", async (request, reply) => {
    if (!ARSY_PROXY_ADMIN) {
      return reply.code(403).send({ error: "aksi tulis lewat web dimatikan" });
    }
    if (!(await gate(request, reply))) return reply;
    return forward(request, reply, "portforwards");
  });

  fastify.delete("/control/portforwards", async (request, reply) => {
    if (!ARSY_PROXY_ADMIN) {
      return reply.code(403).send({ error: "aksi tulis lewat web dimatikan" });
    }
    if (!(await gate(request, reply))) return reply;
    return forward(request, reply, "portforwards");
  });

  fastify.get<{ Params: { path: string } }>("/control/:path", async (request, reply) => {
    const { path } = request.params;
    if (!READ_PATHS.has(path)) {
      return reply.code(404).send({ error: `path control tidak dikenal: ${path}` });
    }
    if (!(await gate(request, reply))) return reply;
    return forward(request, reply, path);
  });

  fastify.post<{ Params: { path: string } }>("/control/:path", async (request, reply) => {
    const { path } = request.params;
    if (!WRITE_PATHS.has(path)) {
      return reply.code(404).send({ error: `path control tidak dikenal: ${path}` });
    }
    if (!ARSY_PROXY_ADMIN) {
      return reply.code(403).send({
        error: "aksi tulis lewat web dimatikan; set ARSY_PROXY_ADMIN=1 untuk mengaktifkan",
      });
    }
    if (!(await gate(request, reply))) return reply;
    return forward(request, reply, path);
  });

  // ---- VPN ----
  fastify.get("/control/vpn/status", async (request, reply) => {
    if (!(await gate(request, reply))) return reply;
    return forward(request, reply, "vpn/status");
  });

  fastify.get("/control/vpn/subnets", async (request, reply) => {
    if (!(await gate(request, reply))) return reply;
    return forward(request, reply, "vpn/subnets");
  });

  fastify.post("/control/vpn/subnets", async (request, reply) => {
    if (!ARSY_PROXY_ADMIN) {
      return reply.code(403).send({ error: "aksi tulis lewat web dimatikan" });
    }
    if (!(await gate(request, reply))) return reply;
    return forward(request, reply, "vpn/subnets");
  });

  fastify.delete<{ Params: { name: string } }>(
    "/control/vpn/subnets/:name",
    async (request, reply) => {
      if (!ARSY_PROXY_ADMIN) {
        return reply.code(403).send({ error: "aksi tulis lewat web dimatikan" });
      }
      if (!(await gate(request, reply))) return reply;
      const name = encodeURIComponent(request.params.name);
      return forward(request, reply, `vpn/subnets/${name}`);
    },
  );

  for (const sub of ["vpn/up", "vpn/down", "vpn/peers"] as const) {
    fastify.post(`/control/${sub}`, async (request, reply) => {
      if (!ARSY_PROXY_ADMIN) {
        return reply.code(403).send({ error: "aksi tulis lewat web dimatikan" });
      }
      if (!(await gate(request, reply))) return reply;
      return forward(request, reply, sub);
    });
  }

  fastify.get<{ Params: { name: string } }>(
    "/control/vpn/peers/:name/config",
    async (request, reply) => {
      if (!(await gate(request, reply))) return reply;
      const name = encodeURIComponent(request.params.name);
      return forward(request, reply, `vpn/peers/${name}/config`);
    },
  );

  fastify.post<{ Params: { name: string } }>(
    "/control/vpn/peers/:name/quota",
    async (request, reply) => {
      if (!ARSY_PROXY_ADMIN) {
        return reply.code(403).send({ error: "aksi tulis lewat web dimatikan" });
      }
      if (!(await gate(request, reply))) return reply;
      const name = encodeURIComponent(request.params.name);
      return forward(request, reply, `vpn/peers/${name}/quota`);
    },
  );

  fastify.delete<{ Params: { name: string } }>(
    "/control/vpn/peers/:name",
    async (request, reply) => {
      if (!ARSY_PROXY_ADMIN) {
        return reply.code(403).send({ error: "aksi tulis lewat web dimatikan" });
      }
      if (!(await gate(request, reply))) return reply;
      const name = encodeURIComponent(request.params.name);
      return forward(request, reply, `vpn/peers/${name}`);
    },
  );
}
