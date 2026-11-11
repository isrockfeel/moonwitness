import type { FastifyInstance } from "fastify";
import { getDb } from "@moonwitness/orm";

export const systemModels = ["users", "settings"] as const;

export async function registerBaseAddon(fastify: FastifyInstance): Promise<void> {
  // Health check
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Agent-native metadata endpoints
  fastify.get("/_meta/models", async () => {
    const rows = getDb().all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    return { models: rows.map((r) => r.name) };
  });

  fastify.get("/_meta/models/:name", async (request, reply) => {
    const { name } = request.params as { name: string };
    const columns = getDb().all<Record<string, unknown>>(
      "SELECT name, type, \"notnull\", dflt_value FROM pragma_table_info(?)",
      [name],
    );
    if (!columns.length) {
      return reply.code(404).send({ error: `Model '${name}' not found` });
    }
    return { name, fields: columns };
  });

  fastify.get("/_meta/llms.txt", async (_request, reply) => {
    const rows = getDb().all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const body = [
      "# Moonwitness API",
      "",
      "Machine-readable manifest for AI agents.",
      "",
      "## Models",
      ...rows.map((r) => `- ${r.name}`),
      "",
      "## Endpoints",
      "- GET /health — service health",
      "- GET /_meta/models — list all models",
      "- GET /_meta/models/:name — schema of one model",
      "- GET /_meta/openapi.json — OpenAPI document",
    ].join("\n");
    return reply.type("text/plain; charset=utf-8").send(body);
  });
}
