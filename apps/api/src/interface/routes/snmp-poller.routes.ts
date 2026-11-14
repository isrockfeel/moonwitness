import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const SNMP_POLLER_URL = process.env.SNMP_POLLER_URL ?? "http://127.0.0.1:8094";

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
    upstream = await fetch(`${SNMP_POLLER_URL}${target}`, {
      method,
      headers: forwardHeaders(request),
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    request.log.warn({ err: error, target }, "snmp-poller tidak dapat dihubungi");
    return reply.code(502).send({ error: "snmp-poller tidak dapat dihubungi", reachable: false });
  }

  const text = await upstream.text();
  return reply
    .code(upstream.status)
    .header("content-type", upstream.headers.get("content-type") ?? "application/json")
    .header("cache-control", "no-store")
    .send(text);
}

export async function snmpPollerRoutes(fastify: FastifyInstance) {
  fastify.get("/snmp/health", async (request, reply) => forward(request, reply, "/health", "GET"));

  fastify.get("/snmp/devices", async (request, reply) =>
    forward(request, reply, "/api/devices", "GET"),
  );

  fastify.post("/snmp/devices", async (request, reply) =>
    forward(request, reply, "/api/devices", "POST"),
  );

  fastify.get<{ Params: { id: string } }>("/snmp/devices/:id", async (request, reply) =>
    forward(request, reply, `/api/devices/${encodeURIComponent(request.params.id)}`, "GET"),
  );

  fastify.delete<{ Params: { id: string } }>("/snmp/devices/:id", async (request, reply) =>
    forward(request, reply, `/api/devices/${encodeURIComponent(request.params.id)}`, "DELETE"),
  );

  fastify.get<{ Params: { id: string } }>("/snmp/devices/:id/targets", async (request, reply) =>
    forward(request, reply, `/api/devices/${encodeURIComponent(request.params.id)}/targets`, "GET"),
  );

  fastify.post<{ Params: { id: string } }>("/snmp/devices/:id/targets", async (request, reply) =>
    forward(
      request,
      reply,
      `/api/devices/${encodeURIComponent(request.params.id)}/targets`,
      "POST",
    ),
  );

  fastify.get<{ Params: { id: string } }>("/snmp/targets/:id", async (request, reply) =>
    forward(request, reply, `/api/targets/${encodeURIComponent(request.params.id)}`, "GET"),
  );

  fastify.delete<{ Params: { id: string } }>("/snmp/targets/:id", async (request, reply) =>
    forward(request, reply, `/api/targets/${encodeURIComponent(request.params.id)}`, "DELETE"),
  );

  fastify.get<{ Params: { id: string } }>("/snmp/targets/:id/samples", async (request, reply) => {
    const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
    return forward(
      request,
      reply,
      `/api/targets/${encodeURIComponent(request.params.id)}/samples${query}`,
      "GET",
    );
  });

  fastify.get<{ Params: { id: string } }>("/snmp/targets/:id/latest", async (request, reply) =>
    forward(request, reply, `/api/targets/${encodeURIComponent(request.params.id)}/latest`, "GET"),
  );

  fastify.get("/snmp/stats", async (request, reply) =>
    forward(request, reply, "/api/stats", "GET"),
  );
}
