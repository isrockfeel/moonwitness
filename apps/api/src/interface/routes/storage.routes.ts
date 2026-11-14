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

interface BucketParams {
  bucket: string;
}

interface ObjectParams {
  bucket: string;
  "*": string;
}

export async function storageRoutes(fastify: FastifyInstance) {
  fastify.get("/storage/health", async (request, reply) =>
    forward(request, reply, "/health", "GET"),
  );

  fastify.get("/storage/buckets", async (request, reply) => forward(request, reply, "/", "GET"));

  fastify.put<{ Params: BucketParams }>("/storage/buckets/:bucket", async (request, reply) =>
    forward(request, reply, `/${request.params.bucket}`, "PUT"),
  );

  fastify.head<{ Params: BucketParams }>("/storage/buckets/:bucket", async (request, reply) =>
    forward(request, reply, `/${request.params.bucket}`, "HEAD"),
  );

  fastify.delete<{ Params: BucketParams }>("/storage/buckets/:bucket", async (request, reply) =>
    forward(request, reply, `/${request.params.bucket}`, "DELETE"),
  );

  fastify.get<{ Params: BucketParams }>(
    "/storage/buckets/:bucket/objects",
    async (request, reply) => {
      const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
      return forward(request, reply, `/${request.params.bucket}/objects${query}`, "GET");
    },
  );

  fastify.put<{ Params: ObjectParams }>("/storage/buckets/:bucket/*", async (request, reply) => {
    const params = request.params as ObjectParams;
    const key = params["*"] ?? "";
    const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
    return forward(request, reply, `/${params.bucket}/${key}${query}`, "PUT");
  });

  fastify.post<{ Params: ObjectParams }>("/storage/buckets/:bucket/*", async (request, reply) => {
    const params = request.params as ObjectParams;
    const key = params["*"] ?? "";
    const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
    return forward(request, reply, `/${params.bucket}/${key}${query}`, "POST");
  });

  fastify.get<{ Params: ObjectParams }>("/storage/buckets/:bucket/*", async (request, reply) => {
    const params = request.params as ObjectParams;
    const key = params["*"] ?? "";
    const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
    return forward(request, reply, `/${params.bucket}/${key}${query}`, "GET");
  });

  fastify.head<{ Params: ObjectParams }>("/storage/buckets/:bucket/*", async (request, reply) => {
    const params = request.params as ObjectParams;
    const key = params["*"] ?? "";
    const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
    return forward(request, reply, `/${params.bucket}/${key}${query}`, "HEAD");
  });

  fastify.delete<{ Params: ObjectParams }>("/storage/buckets/:bucket/*", async (request, reply) => {
    const params = request.params as ObjectParams;
    const key = params["*"] ?? "";
    const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
    return forward(request, reply, `/${params.bucket}/${key}${query}`, "DELETE");
  });
}
