import type { FastifyInstance } from "fastify";
import { getDb } from "@moonwitness/orm";

/**
 * Liveness and readiness endpoints.
 *
 * Liveness (`/healthz`) reports only that the process is running.
 * Readiness (`/readyz`) additionally verifies database connectivity and returns
 * 503 when the database is unreachable, without leaking error details.
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/healthz", async () => ({ status: "ok" }));

  fastify.get("/readyz", async (_request, reply) => {
    let database = "ok";
    try {
      await getDb().get("SELECT 1 AS ok");
    } catch {
      database = "unavailable";
    }

    if (database !== "ok") {
      return reply.code(503).send({ status: "unavailable", database });
    }
    return reply.code(200).send({ status: "ready", database });
  });
}
