import type { FastifyInstance } from "fastify";
import { TimelineEvent } from "./model";
import { registerBaseAddon } from "../__base/src/index";

export async function registerTimelineAddon(fastify: FastifyInstance): Promise<void> {
  // Register base endpoints first
  await registerBaseAddon(fastify);

  // Timeline routes
  fastify.get(
    "/events",
    {
      schema: {
        querystring: {
          era?: string,
          kind?: string,
          from?: string,
          to?: string,
          limit?: number,
          offset?: number,
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
                    "id", "kind", "date", "era", "title", "excerpt", "body",
                    "location", "tags", "sources", "notes", "image", "related",
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
      const rows = db.all(
        `SELECT * FROM timeline_events WHERE status != 'deleted'`,
      );
      const data = rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        date: r.date,
        era: r.era,
        title: r.title,
        excerpt: r.excerpt,
        body: r.body,
        location: r.location,
        tags: r.tags,
        sources: r.sources,
        notes: r.notes,
        image: r.image,
        imagePosition: r.imagePosition,
        related: r.related,
      }));
      return { data, total: data.length };
    },
  );

  fastify.get(
    "/events/:id",
    {
      schema: {
        params: { id: { type: "string" } },
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
                  "id", "kind", "date", "era", "title", "excerpt", "body",
                  "location", "tags", "sources", "notes", "image", "related",
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
      const row = db.get(`SELECT * FROM timeline_events WHERE id = ?`, [id]);
      if (!row) {
        return reply.code(404).send({ error: "TimelineEvent not found" });
      }
      return {
        data: {
          id: row.id,
          kind: row.kind,
          date: row.date,
          era: row.era,
          title: row.title,
          excerpt: row.excerpt,
          body: row.body,
          location: row.location,
          tags: row.tags,
          sources: row.sources,
          notes: row.notes,
          image: row.image,
          imagePosition: row.imagePosition,
          related: row.related,
        },
      };
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
              byEra: { type: "object" },
              byKind: { type: "object" },
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
      const total = db.get(`SELECT COUNT(*) as c FROM timeline_events WHERE status != 'deleted'`).c;
      const byEra = db.all(
        `SELECT era, COUNT(*) as c FROM timeline_events WHERE status != 'deleted' GROUP BY era`,
      ).reduce((acc, r) => ({ ...acc, [r.era]: r.c }), {} as Record<string, number>);
      const byKind = db.all(
        `SELECT kind, COUNT(*) as c FROM timeline_events WHERE status != 'deleted' GROUP BY kind`,
      ).reduce((acc, r) => ({ ...acc, [r.kind]: r.c }), {} as Record<string, number>);
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
      const rows = db.all(`SELECT * FROM eras`);
      return { data: rows };
    },
  );
}