import type { FastifyInstance } from "fastify";
import { TimelineController } from "../controllers/timeline.controller";
import type { ListTimelineEventsRequest } from "../../domain/usecases/timeline/timeline.usecase";
import { optionalAuth } from "../../middleware/auth";
import {
  listTimelineQuerySchema,
  timelineEventListResponseSchema,
  timelineEventResponseSchema,
  timelineStatsResponseSchema,
  eraResponseSchema,
  errorResponseSchema,
  paramIdSchema,
} from "./schemas";

export async function timelineRoutes(fastify: FastifyInstance) {
  const controller = new TimelineController(fastify.timelineUseCase);
  fastify.addHook("preHandler", optionalAuth());

  fastify.get<{ Querystring: ListTimelineEventsRequest }>(
    "/events",
    {
      schema: {
        querystring: listTimelineQuerySchema,
        response: {
          200: timelineEventListResponseSchema,
          500: errorResponseSchema,
        },
        tags: ["timeline"],
        summary: "List timeline events",
        description: "Retrieve a paginated list of timeline events with optional filters",
      },
    },
    (request, reply) => controller.listEvents(request, reply),
  );

  fastify.get<{ Params: { id: string } }>(
    "/events/:id",
    {
      schema: {
        params: paramIdSchema,
        response: {
          200: timelineEventResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
        tags: ["timeline"],
        summary: "Get timeline event by ID",
        description: "Retrieve a single timeline event by its ID",
      },
    },
    (request, reply) => controller.getEvent(request, reply),
  );

  fastify.get(
    "/stats",
    {
      schema: {
        response: {
          200: timelineStatsResponseSchema,
          500: errorResponseSchema,
        },
        tags: ["timeline"],
        summary: "Get timeline statistics",
        description: "Retrieve aggregate statistics about timeline events",
      },
    },
    (request, reply) => controller.getStats(request, reply),
  );

  fastify.get(
    "/eras",
    {
      schema: {
        response: {
          200: eraResponseSchema,
          500: errorResponseSchema,
        },
        tags: ["timeline"],
        summary: "List eras",
        description: "Retrieve all available eras",
      },
    },
    (request, reply) => controller.getEras(request, reply),
  );
}
