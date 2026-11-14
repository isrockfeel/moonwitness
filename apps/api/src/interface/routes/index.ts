import type { FastifyInstance } from "fastify";
import { timelineRoutes } from "./timeline.routes";

/**
 * Legacy route registration point.
 * The production API is built via buildApp/buildFastify and the addon
 * registry; this helper is kept for compatibility with callers that
 * register routes directly on a pre-built Fastify instance.
 */
export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(timelineRoutes, { prefix: "/timeline" });
}
