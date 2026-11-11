import type { FastifyInstance } from "fastify";
import { registerTimelineRoutes } from "./routes.js";
import { timelineManifest } from "./manifest.js";

export { registerTimelineRoutes } from "./routes.js";
export { timelineManifest } from "./manifest.js";
export { timelineDdl, timelineEventModel, timelineEraModel } from "./model.js";
export { seedTimeline, eras, events } from "./seed.js";

export interface TimelineAddonOptions {
  /** Route prefix owned by the host that mounts this addon, e.g. "/api/v1/timeline". */
  prefix: string;
}

/**
 * Mounts the timeline addon's routes exactly once. The addon owns its model,
 * seed and routes; hosts must not re-implement any of them.
 */
export async function registerTimelineAddon(
  fastify: FastifyInstance,
  options: TimelineAddonOptions,
): Promise<void> {
  await fastify.register(registerTimelineRoutes, { prefix: options.prefix });
}

export const timelineRoutesPrefix = "/timeline";
