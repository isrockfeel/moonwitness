import { AddonRegistryImpl } from "@moonwitness/orm";
import { initDb, closeDb, getDb } from "@moonwitness/orm";
import { env } from "./shared/env";
import { schemaDdl } from "./infrastructure/persistence/schema";
import { SqlTimelineRepository } from "./infrastructure/persistence/timeline-sql.repository";
import { TimelineUseCase } from "./domain/usecases/timeline/timeline.usecase";
import { authMiddleware, setJwtSecret } from "@moonwitness/auth";
import type { FastifyInstance } from "fastify";

export interface BootstrapOptions {
  dbPath?: string;
  prefix?: string;
  enableAddons?: boolean;
  enableAuth?: boolean;
}

export async function buildApp(options: BootstrapOptions = {}): Promise<FastifyInstance> {
  const dbPath = options.dbPath ?? env.DATABASE_URL ?? "./moonwitness.db";
  await initDb(dbPath);

  // Run legacy schema DDL for backward compatibility
  await getDb().exec(schemaDdl);

  // Initialize addon registry and load addons
  let addonRegistry: AddonRegistryImpl | null = null;
  let addonRoutePrefixes: string[] = [];

  if (options.enableAddons ?? true) {
    addonRegistry = new AddonRegistryImpl();
    await addonRegistry.loadAddons();
    addonRoutePrefixes = addonRegistry.getRoutePrefixes();
  }

  // Keep existing timeline repository and usecase for backward compatibility
  const repository = new SqlTimelineRepository();
  const timelineUseCase = new TimelineUseCase(repository);

  const { buildFastify } = await import("./infrastructure/adapters/fastify.adapter");
  const fastify = await buildFastify({
    timelineUseCase,
  });

  // Set JWT secret for auth middleware (avoiding circular dependency)
  setJwtSecret(env.JWT_SECRET ?? "development-secret");

  // Add auth middleware to extract JWT and build ActorContext
  if (options.enableAuth ?? true) {
    fastify.addHook("preHandler", authMiddleware);
  }

  const prefix = options.prefix ?? env.API_PREFIX;
  const { registerRoutes } = await import("./interface/routes");

  // Register addon routes BEFORE legacy routes to allow addon routes to take precedence
  if (addonRegistry) {
    // Add route registration from addons
    for (const routePrefix of addonRoutePrefixes) {
      const addonName = routePrefix.slice(1); // remove leading slash
      const addon = addonRegistry.getAddon(addonName);
      if (addon) {
        await fastify.register(
          async (instance: FastifyInstance) => {
            await addon.registerRoutes(instance);
          },
          { prefix: routePrefix },
        );
      }
    }
  }

  // Register legacy routes (including timeline) under prefix
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