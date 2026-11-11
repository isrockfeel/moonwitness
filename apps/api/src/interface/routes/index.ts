import type { FastifyInstance } from "fastify";
import { timelineRoutes } from "./timeline.routes";
import { healthRoutes } from "./health.routes";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(timelineRoutes, { prefix: "/timeline" });
  await fastify.register(healthRoutes);
}
