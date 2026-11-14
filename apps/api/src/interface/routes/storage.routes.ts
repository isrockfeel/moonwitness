import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const STORAGE_URL = process.env.STORAGE_URL ?? "http://127.0.0.1:8091";

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
    upstream = await fetch(`${STORAGE_URL}${target}`, {
      method,
      headers: forwardHeaders(request),
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    request.log.warn({ err: error, target }, "storage tidak dapat dihubungi");
    return reply.code(502).send({ error: "storage tidak dapat dihubungi", reachable: false });
  }

  const text = await upstream.text();
  return reply
    .code(upstream.status)
    .header("content-type", upstream.headers.get("content-type") ?? "application/xml")
    .header("cache-control", "no-store")
    .send(text);
}

interface WildcardParams {
  "*": string;
}

/**
 * Parse the wildcard tail into bucket + optional key.
 * `/storage/buckets/*` captures everything after `/storage/buckets/`.
 * - `mybucket`            → bucket="mybucket", key=""
 * - `mybucket/path/to.js` → bucket="mybucket", key="path/to.js"
 */
function parseBucketKey(wildcard: string): { bucket: string; key: string } {
  const trimmed = wildcard.replace(/^\/+/, "");
  const slash = trimmed.indexOf("/");
  if (slash === -1) return { bucket: trimmed, key: "" };
  return { bucket: trimmed.slice(0, slash), key: trimmed.slice(slash + 1) };
}

function queryOf(request: FastifyRequest): string {
  return request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
}

export async function storageRoutes(fastify: FastifyInstance) {
  fastify.get("/storage/health", async (request, reply) =>
    forward(request, reply, "/health", "GET"),
  );

  fastify.get("/storage/buckets", async (request, reply) => forward(request, reply, "/", "GET"));

  // All bucket/object operations share one wildcard route to avoid Fastify
  // route conflicts between `/:bucket` and `/:bucket/*`.
  fastify.put<{ Params: WildcardParams }>("/storage/buckets/*", async (request, reply) => {
    const { bucket, key } = parseBucketKey(request.params["*"]);
    if (key) {
      return forward(request, reply, `/${bucket}/${key}${queryOf(request)}`, "PUT");
    }
    return forward(request, reply, `/${bucket}`, "PUT");
  });

  fastify.head<{ Params: WildcardParams }>("/storage/buckets/*", async (request, reply) => {
    const { bucket, key } = parseBucketKey(request.params["*"]);
    if (key) {
      return forward(request, reply, `/${bucket}/${key}${queryOf(request)}`, "HEAD");
    }
    return forward(request, reply, `/${bucket}`, "HEAD");
  });

  fastify.delete<{ Params: WildcardParams }>("/storage/buckets/*", async (request, reply) => {
    const { bucket, key } = parseBucketKey(request.params["*"]);
    if (key) {
      return forward(request, reply, `/${bucket}/${key}${queryOf(request)}`, "DELETE");
    }
    return forward(request, reply, `/${bucket}`, "DELETE");
  });

  fastify.post<{ Params: WildcardParams }>("/storage/buckets/*", async (request, reply) => {
    const { bucket, key } = parseBucketKey(request.params["*"]);
    return forward(request, reply, `/${bucket}/${key}${queryOf(request)}`, "POST");
  });

  fastify.get<{ Params: WildcardParams }>("/storage/buckets/*", async (request, reply) => {
    const { bucket, key } = parseBucketKey(request.params["*"]);
    if (key) {
      return forward(request, reply, `/${bucket}/${key}${queryOf(request)}`, "GET");
    }
    // Bucket listing: GET /storage/buckets/:bucket?list-type=2
    return forward(request, reply, `/${bucket}${queryOf(request)}`, "GET");
  });
}
