import type { FastifyInstance } from "fastify";
import { createMetadataRegistry, registerMetadataRoutes } from "./metadata.js";

export const systemModels = ["users", "settings"] as const;

/**
 * Approved model metadata for this addon. Only these fields are published via
 * /_meta/*; the database schema is never introspected for public output.
 */
export const baseMetadata = createMetadataRegistry([
  {
    name: "timeline.event",
    description: "A timeline event (story-world record).",
    publicFields: [
      { name: "id", type: "string" },
      { name: "kind", type: "string" },
      { name: "date", type: "string" },
      { name: "era", type: "string" },
      { name: "title", type: "string" },
      { name: "excerpt", type: "string" },
      { name: "tags", type: "string[]" },
    ],
  },
  {
    name: "timeline.era",
    description: "A narrative era grouping timeline events.",
    publicFields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "years", type: "string" },
      { name: "color", type: "string" },
    ],
  },
]);

export async function registerBaseAddon(fastify: FastifyInstance): Promise<void> {
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  await registerMetadataRoutes(fastify, baseMetadata);
}
