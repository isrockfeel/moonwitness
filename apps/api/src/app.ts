import { initDb, closeDb, getDb } from "@moonwitness/orm";
import { env } from "./shared/env";
import { timelineDdl } from "./infrastructure/persistence/timeline-model";
import { SqlTimelineRepository } from "./infrastructure/persistence/timeline-sql.repository";
import { TimelineUseCase } from "./domain/usecases/timeline/timeline.usecase";
import { AddonRegistry } from "@moonwitness/addon-base/registry";
import { registerBaseAddon } from "@moonwitness/addon-base";
import type { FastifyInstance } from "fastify";

export interface BootstrapOptions {
  dbPath?: string;
  prefix?: string;
}

export async function buildApp(options: BootstrapOptions = {}): Promise<FastifyInstance> {
  const dbPath = options.dbPath ?? env.DATABASE_URL ?? "./moonwitness.db";
  await initDb(dbPath);

  await getDb().exec(timelineDdl);

  const repository = new SqlTimelineRepository();
  const timelineUseCase = new TimelineUseCase(repository);

  const { buildFastify } = await import("./infrastructure/adapters/fastify.adapter");
  const fastify = await buildFastify({
    timelineUseCase,
    prefix: options.prefix ?? env.API_PREFIX,
  });

  // Addons load from manifests through the registry (deterministic order,
  // validated dependencies). __base provides health + metadata endpoints.
  const registry = new AddonRegistry();
  registry.add({
    manifest: {
      name: "__base",
      version: "0.1.0",
      depends: [],
      provides: { routes: ["health", "_meta"], models: [] },
    },
    register: async () => {
      await registerBaseAddon(fastify);
    },
  });
  await registry.load();

  const { registerRoutes } = await import("./interface/routes");
  await registerRoutes(fastify);

  fastify.addHook("onClose", async () => {
    closeDb();
  });

  return fastify;
}
