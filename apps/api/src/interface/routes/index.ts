import type { FastifyInstance } from "fastify";
import { timelineRoutes } from "./timeline.routes";
import { controlRoutes } from "./control.routes";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(timelineRoutes, { prefix: "/timeline" });
  await fastify.register(controlRoutes);
}
