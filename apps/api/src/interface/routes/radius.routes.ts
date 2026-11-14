import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const RADIUS_URL = process.env.RADIUS_URL ?? "http://127.0.0.1:8090";

// Write endpoints dikunci di balik env, sama seperti control.routes.ts.
const RADIUS_PROXY_ADMIN = process.env.RADIUS_PROXY_ADMIN === "1";

function forwardHeaders(request: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  if (request.body) headers["content-type"] = "application/json";
  return headers;
}

async function forward(
  request: FastifyRequest,
  reply: FastifyReply,
  target: string,
  method: string,
) {
  let upstream: Response;
  try {
    upstream = await fetch(`${RADIUS_URL}${target}`, {
      method,
      headers: forwardHeaders(request),
      body: (() => {
        const b = request.body;
        return typeof b === "string" || b instanceof Buffer ? b : b ? JSON.stringify(b) : undefined;
      })(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    request.log.warn({ err: error, target }, "radius tidak dapat dihubungi");
    return reply.code(502).send({ error: "radius tidak dapat dihubungi", reachable: false });
  }

  const text = await upstream.text();
  return reply
    .code(upstream.status)
    .header("content-type", upstream.headers.get("content-type") ?? "application/json")
    .header("cache-control", "no-store")
    .send(text);
}

function requireAdmin(reply: FastifyReply): boolean {
  if (!RADIUS_PROXY_ADMIN) {
    reply.code(403).send({
      error: "aksi tulis radius dimatikan; set RADIUS_PROXY_ADMIN=1 untuk mengaktifkan",
    });
    return false;
  }
  return true;
}

export async function radiusRoutes(fastify: FastifyInstance) {
  fastify.get("/radius/health", async (request, reply) =>
    forward(request, reply, "/health", "GET"),
  );

  fastify.get("/radius/users", async (request, reply) =>
    forward(request, reply, "/api/users", "GET"),
  );

  fastify.get<{ Params: { username: string } }>("/radius/users/:username", async (request, reply) =>
    forward(request, reply, `/api/users/${encodeURIComponent(request.params.username)}`, "GET"),
  );

  fastify.post("/radius/users", async (request, reply) => {
    if (!requireAdmin(reply)) return reply;
    return forward(request, reply, "/api/users", "POST");
  });

  fastify.put<{ Params: { username: string } }>(
    "/radius/users/:username",
    async (request, reply) => {
      if (!requireAdmin(reply)) return reply;
      return forward(
        request,
        reply,
        `/api/users/${encodeURIComponent(request.params.username)}`,
        "PUT",
      );
    },
  );

  fastify.delete<{ Params: { username: string } }>(
    "/radius/users/:username",
    async (request, reply) => {
      if (!requireAdmin(reply)) return reply;
      return forward(
        request,
        reply,
        `/api/users/${encodeURIComponent(request.params.username)}`,
        "DELETE",
      );
    },
  );

  fastify.get("/radius/logs", async (request, reply) => {
    const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
    return forward(request, reply, `/api/logs${query}`, "GET");
  });

  fastify.get("/radius/stats", async (request, reply) =>
    forward(request, reply, "/api/stats", "GET"),
  );
}
