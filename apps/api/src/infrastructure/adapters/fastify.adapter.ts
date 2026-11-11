import type { FastifyInstance, FastifyRegisterOptions } from "fastify";
import Fastify from "fastify";
import FastifyCors from "@fastify/cors";
import FastifySwagger from "@fastify/swagger";
import FastifySwaggerUi from "@fastify/swagger-ui";
import { env } from "../shared/env";
import type { ITimelineUseCase } from "../domain/usecases/timeline/timeline.usecase";
import { initDb, getDb, createActorContext, SYSTEM_ACTOR } from "@moonwitness/orm";

export interface BootstrapOptions {
  timelineUseCase: ITimelineUseCase;
  prefix?: string;
}

export async function buildFastify(options: BootstrapOptions): Promise<FastifyInstance> {
  const fastify: FastifyInstance = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
    ajv: {
      plugins: [...(await import("ajv-formats").then((m) => [m.default]))],
    },
  });

  await fastify.register(FastifyCors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // --- ActorContext Middleware ---
  // Extract actorId from x-actor-id header, fall back to SYSTEM_ACTOR
  fastify.decorate("actorContext", (): import("@moonwitness/orm").ActorContext => {
    const actorId = (fastify.request.headers["x-actor-id"] as string | null) ?? null;
    return actorId !== null
      ? createActorContext(actorId, "api", fastify.request.id ?? undefined)
      : SYSTEM_ACTOR;
  });

  fastify.addHook("onRequest", (request, reply, next) => {
    // Generate correlation ID for this request
    request.id = crypto.randomUUID();
    next();
  });

  if (env.NODE_ENV !== "production") {
    await fastify.register(FastifySwagger, {
      openapi: {
        openapi: "3.0.0",
        info: {
          title: "Moonwitness API",
          version: "1.0.0",
          description: "Timeline and witness data API",
        },
        servers: [
          {
            url: `http://${env.HOST}:${env.PORT}`,
            description: "Development server",
          },
        ],
      },
      plugins: [
        // @ts-expect-error - swagger-ui adds plugins dynamically
        (await import("fastify-swagger-ui")).default,
      ],
    });

    await fastify.register(FastifySwaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: false,
      },
    });
  }

  fastify.decorate("timelineUseCase", options.timelineUseCase);

  if (options.prefix) {
    fastify.register(
      async (instance) => {
        instance.register(
          async (plugin: FastifyInstance) => {
            const { registerRoutes } = await import("../interface/routes");
            await registerRoutes(plugin);
          },
          { prefix: options.prefix },
        );
      },
      { prefix: "" },
    );
  }

  return fastify;
}