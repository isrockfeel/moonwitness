import { initDb, getDb } from "@moonwitness/orm";
import { env } from "./shared/env";

export async function buildApp(dependencies: Record<string, unknown> = {}) {
  // Initialize SQLite database
  const dbPath = env.DATABASE_URL ?? "./moonwitness.db";
  initDb(dbPath);
  const db = getDb();

  // Use the ORM repository directly
  const repository = new (await import("@moonwitness/orm")).BaseRepository(
    "timeline.event",
    "timeline_events",
    {} as any,
    true,
  );

  const timelineUseCase = new (await import("./domain/usecases/timeline/timeline.usecase")).TimelineUseCase(repository);

  const { buildFastify } = await import("./infrastructure/adapters/fastify.adapter");
  const fastify = await buildFastify({
    timelineUseCase,
    prefix: env.API_PREFIX,
  });

  const { registerRoutes } = await import("./interface/routes");
  await registerRoutes(fastify);

  return fastify;
}
