import type { FastifyInstance } from "fastify";
import { TimelineRepository, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from "./repository.js";

const eventSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    kind: { type: "string" },
    date: { type: "string" },
    era: { type: "string" },
    title: { type: "string" },
    excerpt: { type: "string" },
    body: { type: "string" },
    location: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    sources: { type: "integer" },
    notes: { type: "integer" },
    image: { type: "string" },
    imagePosition: { type: "string" },
    related: { type: "array", items: { type: "string" } },
  },
  required: [
    "id",
    "kind",
    "date",
    "era",
    "title",
    "excerpt",
    "body",
    "location",
    "tags",
    "sources",
    "notes",
    "image",
    "related",
  ],
} as const;

const eraSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    years: { type: "string" },
    tagline: { type: "string" },
    color: { type: "string" },
  },
  required: ["id", "name", "years", "tagline", "color"],
} as const;

const listQuerySchema = {
  type: "object",
  properties: {
    era: { type: "string" },
    kind: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    limit: { type: "integer", minimum: 1, maximum: MAX_LIST_LIMIT, default: DEFAULT_LIST_LIMIT },
    offset: { type: "integer", minimum: 0, default: 0 },
  },
  additionalProperties: false,
} as const;

const idParamsSchema = {
  type: "object",
  properties: { id: { type: "string" } },
  required: ["id"],
} as const;

const errorSchema = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
} as const;

interface ListQuery {
  era?: string;
  kind?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Public read-only timeline routes. Register through a Fastify plugin with the
 * host's prefix so routes stay relative to the addon mount point.
 */
export async function registerTimelineRoutes(fastify: FastifyInstance): Promise<void> {
  const repository = new TimelineRepository();

  fastify.get<{ Querystring: ListQuery }>(
    "/events",
    {
      schema: {
        querystring: listQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: eventSchema },
              total: { type: "integer" },
            },
            required: ["data", "total"],
          },
        },
      },
    },
    async (request) => repository.listEvents(request.query),
  );

  fastify.get<{ Params: { id: string } }>(
    "/events/:id",
    {
      schema: {
        params: idParamsSchema,
        response: {
          200: {
            type: "object",
            properties: { data: eventSchema },
            required: ["data"],
          },
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const event = await repository.getEvent(request.params.id);
      if (!event) {
        return reply
          .code(404)
          .send({ error: `TimelineEvent with id '${request.params.id}' not found` });
      }
      return { data: event };
    },
  );

  fastify.get(
    "/stats",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  total: { type: "integer" },
                  byEra: { type: "object", additionalProperties: { type: "integer" } },
                  byKind: { type: "object", additionalProperties: { type: "integer" } },
                },
                required: ["total", "byEra", "byKind"],
              },
            },
            required: ["data"],
          },
        },
        summary: "Get timeline statistics",
      },
    },
    async () => ({ data: await repository.getStats() }),
  );

  fastify.get(
    "/eras",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: { data: { type: "array", items: eraSchema } },
            required: ["data"],
          },
        },
        summary: "List eras",
      },
    },
    async () => ({ data: await repository.getEras() }),
  );
}
