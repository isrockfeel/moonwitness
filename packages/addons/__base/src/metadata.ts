import type { FastifyInstance } from "fastify";

/**
 * Registered model metadata, declared by addons rather than introspected from
 * the database. Only `publicFields` are ever exposed; anything else (internal
 * columns, secrets, framework metadata) stays private.
 */
export interface RegisteredModel {
  /** Namespaced model name, e.g. "timeline.event". */
  name: string;
  /** Human description safe to publish. */
  description?: string;
  /** Field names that are approved for public metadata exposure. */
  publicFields: Array<{ name: string; type: string; description?: string }>;
}

export interface MetadataRegistry {
  models: RegisteredModel[];
}

/**
 * Build a metadata registry from addon manifests. Callers pass only approved
 * models; this function does not read the database.
 */
export function createMetadataRegistry(models: RegisteredModel[] = []): MetadataRegistry {
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.name)) {
      throw new Error(`Duplicate metadata model '${model.name}'.`);
    }
    seen.add(model.name);
  }
  return { models: [...models] };
}

/**
 * Register `/_meta/*` endpoints backed by the metadata registry.
 * This replaces raw sqlite_master/pragma introspection with approved,
 * addon-declared metadata so private schema internals never leak.
 */
export async function registerMetadataRoutes(
  fastify: FastifyInstance,
  registry: MetadataRegistry,
): Promise<void> {
  fastify.get("/_meta/models", async () => ({
    models: registry.models.map((model) => model.name),
  }));

  fastify.get("/_meta/models/:name", async (request, reply) => {
    const { name } = request.params as { name: string };
    const model = registry.models.find((entry) => entry.name === name);
    if (!model) {
      return reply.code(404).send({ error: `Model '${name}' not found` });
    }
    return {
      name: model.name,
      description: model.description ?? null,
      fields: model.publicFields.map((field) => ({
        name: field.name,
        type: field.type,
        description: field.description ?? null,
      })),
    };
  });

  fastify.get("/_meta/llms.txt", async (_request, reply) => {
    const lines = [
      "# Moonwitness API",
      "",
      "Machine-readable manifest for AI agents.",
      "",
      "## Models",
      ...registry.models.map((model) => `- ${model.name}`),
      "",
      "## Endpoints",
      "- GET /health — service health",
      "- GET /_meta/models — list registered models",
      "- GET /_meta/models/:name — approved fields of one model",
    ];
    return reply.type("text/plain; charset=utf-8").send(lines.join("\n"));
  });
}
