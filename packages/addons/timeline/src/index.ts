import type { FastifyInstance } from "fastify";
import { getDb } from "@moonwitness/orm";

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    kind: String(r.kind),
    date: String(r.date),
    era: String(r.era),
    title: String(r.title),
    excerpt: String(r.excerpt),
    body: String(r.body),
    location: String(r.location),
    tags: parseJsonArray(r.tags),
    sources: Number(r.sources ?? 0),
    notes: Number(r.notes ?? 0),
    image: String(r.image),
    imagePosition: r.imagePosition == null ? undefined : String(r.imagePosition),
    related: parseJsonArray(r.related),
  };
}

export async function registerTimelineAddon(fastify: FastifyInstance): Promise<void> {
  // Timeline routes
  fastify.get(
    "/events",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            era: { type: "string" },
            kind: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
            limit: { type: "number" },
            offset: { type: "number" },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
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
                },
              },
              total: { type: "integer" },
            },
            required: ["data", "total"],
          },
        },
        tags: ["timeline"],
        summary: "List timeline events",
      },
    },
    async (request, reply) => {
      const { era, kind, from, to, limit, offset } = request.query as {
        era?: string;
        kind?: string;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
      };
      const db = await import("@moonwitness/orm").then((m) => m.getDb());
      const rows = await db.all<Record<string, unknown>>(
        `SELECT * FROM timeline_events WHERE status != 'deleted'`,
      );
      const data = rows.map(mapRow);
      return { data, total: data.length };
    },
  );

  fastify.get(
    "/events/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
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
              },
            },
            required: ["data"],
          },
          404: { type: "object", properties: { error: { type: "string" } } },
        },
        tags: ["timeline"],
        summary: "Get timeline event by ID",
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = await import("@moonwitness/orm").then((m) => m.getDb());
      const row = await db.get<Record<string, unknown>>(
        `SELECT * FROM timeline_events WHERE id = ?`,
        [id],
      );
      if (!row) {
        return reply.code(404).send({ error: "TimelineEvent not found" });
      }
      return { data: mapRow(row) };
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
              total: { type: "integer" },
              byEra: { type: "object", additionalProperties: { type: "integer" } },
              byKind: { type: "object", additionalProperties: { type: "integer" } },
            },
            required: ["total", "byEra", "byKind"],
          },
        },
        tags: ["timeline"],
        summary: "Get timeline statistics",
      },
    },
    async (_request, reply) => {
      const db = await import("@moonwitness/orm").then((m) => m.getDb());
      const totalRow = await db.get(
        `SELECT COUNT(*) as c FROM timeline_events WHERE status != 'deleted'`,
      );
      const total = Number(totalRow?.c ?? 0);
      const byEraRows = await db.all<{ era: string; c: number }>(
        `SELECT era, COUNT(*) as c FROM timeline_events WHERE status != 'deleted' GROUP BY era`,
      );
      const byEra = byEraRows.reduce<Record<string, number>>((acc, r) => {
        acc[String(r.era)] = Number(r.c);
        return acc;
      }, {});
      const byKindRows = await db.all<{ kind: string; c: number }>(
        `SELECT kind, COUNT(*) as c FROM timeline_events WHERE status != 'deleted' GROUP BY kind`,
      );
      const byKind = byKindRows.reduce<Record<string, number>>((acc, r) => {
        acc[String(r.kind)] = Number(r.c);
        return acc;
      }, {});
      return { total, byEra, byKind };
    },
  );

  fastify.get(
    "/eras",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    years: { type: "string" },
                    tagline: { type: "string" },
                    color: { type: "string" },
                  },
                  required: ["id", "name", "years", "tagline", "color"],
                },
              },
            },
            required: ["data"],
          },
        },
        tags: ["timeline"],
        summary: "List eras",
      },
    },
    async (_request, reply) => {
      const db = await import("@moonwitness/orm").then((m) => m.getDb());
      const rows = await db.all(`SELECT * FROM eras`);
      return { data: rows };
    },
  );
}
