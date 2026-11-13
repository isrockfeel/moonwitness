import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../shared/env";

const STORAGE_URL = env.STORAGE_URL;

async function forward(
  request: FastifyRequest,
  reply: FastifyReply,
  target: string,
) {
  const headers: Record<string, string> = {};
  const contentType = request.headers["content-type"];
  if (typeof contentType === "string") headers["content-type"] = contentType;
  const range = request.headers.range;
  if (typeof range === "string") headers.range = range;

  let body: string | Buffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (Buffer.isBuffer(request.body)) {
      body = request.body;
    } else if (typeof request.body === "string") {
      body = request.body;
    } else if (request.body !== undefined && request.body !== null) {
      body = JSON.stringify(request.body);
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${STORAGE_URL}${target}`, {
      method: request.method,
      headers,
      body: body as any,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    request.log.warn({ err: error, target }, "storage tidak dapat dihubungi");
    return reply.code(502).send({ error: "storage tidak dapat dihubungi", reachable: false });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const upstreamContentType = upstream.headers.get("content-type") ?? "application/xml";
  reply
    .code(upstream.status)
    .header("content-type", upstreamContentType)
    .header("cache-control", "no-store");
  const etag = upstream.headers.get("etag");
  if (etag) reply.header("etag", etag);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) reply.header("content-range", contentRange);
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) reply.header("accept-ranges", acceptRanges);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) reply.header("content-length", contentLength);
  return reply.send(buffer);
}

export async function storageRoutes(fastify: FastifyInstance) {
  // Accept binary uploads for S3 object bodies.
  fastify.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body),
  );
  fastify.addContentTypeParser("image/*", { parseAs: "buffer" }, (_req, body, done) =>
    done(null, body),
  );
  fastify.addContentTypeParser("text/plain", { parseAs: "buffer" }, (_req, body, done) =>
    done(null, body),
  );

  fastify.get("/storage/health", async (request, reply) => forward(request, reply, "/health"));
  fastify.get("/storage/buckets", async (request, reply) => forward(request, reply, "/"));

  fastify.put<{ Params: { bucket: string } }>("/storage/buckets/:bucket", async (request, reply) =>
    forward(request, reply, `/${encodeURIComponent(request.params.bucket)}`),
  );
  fastify.delete<{ Params: { bucket: string } }>(
    "/storage/buckets/:bucket",
    async (request, reply) =>
      forward(request, reply, `/${encodeURIComponent(request.params.bucket)}`),
  );

  fastify.get<{ Params: { bucket: string } }>(
    "/storage/buckets/:bucket/objects",
    async (request, reply) => {
      const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
      return forward(request, reply, `/${encodeURIComponent(request.params.bucket)}${query}`);
    },
  );

  // Wildcard object routes: key can contain slashes.
  fastify.route({
    method: ["GET", "PUT", "POST", "DELETE", "HEAD"],
    url: "/storage/buckets/:bucket/*",
    handler: async (request, reply) => {
      const params = request.params as { bucket: string; "*": string };
      const key = params["*"] ?? "";
      const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
      const encodedKey = key
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      return forward(
        request,
        reply,
        `/${encodeURIComponent(params.bucket)}/${encodedKey}${query}`,
      );
    },
  });
}