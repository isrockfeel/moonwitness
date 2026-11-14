import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const SYSLOG_URL = process.env.SYSLOG_URL ?? "http://127.0.0.1:8093";

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
    upstream = await fetch(`${SYSLOG_URL}${target}`, {
      method,
      headers: forwardHeaders(request),
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    request.log.warn({ err: error, target }, "syslog tidak dapat dihubungi");
    return reply.code(502).send({ error: "syslog tidak dapat dihubungi", reachable: false });
  }

  const text = await upstream.text();
  return reply
    .code(upstream.status)
    .header("content-type", upstream.headers.get("content-type") ?? "application/json")
    .header("cache-control", "no-store")
    .send(text);
}

export async function syslogRoutes(fastify: FastifyInstance) {
  fastify.get("/syslog/health", async (request, reply) =>
    forward(request, reply, "/health", "GET"),
  );

  fastify.get("/syslog/messages", async (request, reply) => {
    const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
    return forward(request, reply, `/api/messages${query}`, "GET");
  });

  fastify.get<{ Params: { id: string } }>("/syslog/messages/:id", async (request, reply) =>
    forward(request, reply, `/api/messages/${encodeURIComponent(request.params.id)}`, "GET"),
  );

  fastify.get("/syslog/stats", async (request, reply) =>
    forward(request, reply, "/api/stats", "GET"),
  );
}
