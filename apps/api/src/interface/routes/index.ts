import type { FastifyInstance } from "fastify";
import { timelineRoutes } from "./timeline.routes";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(timelineRoutes, { prefix: "/timeline" });
}
