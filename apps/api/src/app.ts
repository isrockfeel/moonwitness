import { initDb, closeDb, getDb } from "@moonwitness/orm";
import { env } from "./shared/env";
import { schemaDdl } from "./infrastructure/persistence/schema";
import { SqlTimelineRepository } from "./infrastructure/persistence/timeline-sql.repository";
import { TimelineUseCase } from "./domain/usecases/timeline/timeline.usecase";
import type { FastifyInstance } from "fastify";

export interface BootstrapOptions {
  dbPath?: string;
  prefix?: string;
}

export async function buildApp(options: BootstrapOptions = {}): Promise<FastifyInstance> {
  const dbPath = options.dbPath ?? env.DATABASE_URL ?? "./moonwitness.db";
  await initDb(dbPath);

  await getDb().exec(schemaDdl);

  const repository = new SqlTimelineRepository();
  const timelineUseCase = new TimelineUseCase(repository);

  const { buildFastify } = await import("./infrastructure/adapters/fastify.adapter");
  const fastify = await buildFastify({
    timelineUseCase,
  });

  const prefix = options.prefix ?? env.API_PREFIX;
  const { registerRoutes } = await import("./interface/routes");
  if (prefix) {
    await fastify.register(
      async (instance: FastifyInstance) => {
        await registerRoutes(instance);
      },
      { prefix },
    );
  } else {
    await registerRoutes(fastify);
  }

  fastify.addHook("onClose", async () => {
    closeDb();
  });

  return fastify;
}
