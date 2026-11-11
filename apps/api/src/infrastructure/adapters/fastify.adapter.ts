import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import type { FastifyError } from "fastify";
import FastifyCors from "@fastify/cors";
import FastifySwagger from "@fastify/swagger";
import FastifySwaggerUi from "@fastify/swagger-ui";
import { env, parseCorsOrigins } from "../../shared/env";
import type { ITimelineUseCase } from "../../domain/usecases/timeline/timeline.usecase";

export interface BootstrapOptions {
  timelineUseCase: ITimelineUseCase;
  prefix?: string;
}

function corsOrigin(): string[] | false {
  const configured = parseCorsOrigins(env.CORS_ORIGINS);
  if (configured.length > 0) return configured;
  if (env.NODE_ENV === "production") return false;
  return ["http://localhost:3000"];
}

export async function buildFastify(options: BootstrapOptions): Promise<FastifyInstance> {
  const fastify: FastifyInstance = Fastify({
    logger: {
      level: env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug"),
    },
    // Never leak internal error details to clients in production.
    disableRequestLogging: false,
  });

  await fastify.register(FastifyCors, {
    origin: corsOrigin(),
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  });

  fastify.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    return payload;
  });

  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const status = error.statusCode ?? 500;
    request.log.error({ err: error }, "request failed");
    if (env.NODE_ENV === "production" && status >= 500) {
      return reply.code(status).send({ error: "internal server error" });
    }
    return reply.code(status).send({ error: error.message });
  });

  fastify.decorate("timelineUseCase", options.timelineUseCase);

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
    });

    await fastify.register(FastifySwaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: false,
      },
    });
  }

  if (options.prefix) {
    await fastify.register(
      async (instance: FastifyInstance) => {
        const { registerRoutes } = await import("../../interface/routes");
        await registerRoutes(instance);
      },
      { prefix: options.prefix },
    );
  }

  return fastify;
}
