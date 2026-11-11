import { z } from "zod";

export const TimelineEndpoint = {
  listEvents: {
    method: "GET" as const,
    path: "/timeline/events",
    query: z.object({
      era: z.string().optional(),
      kind: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    }),
    response: z.object({
      data: z.array(z.any()),
      total: z.number().int(),
    }),
  },
  getEvent: {
    method: "GET" as const,
    path: "/timeline/events/:id",
    params: z.object({ id: z.string() }),
    response: z.object({ data: z.any() }),
  },
  getStats: {
    method: "GET" as const,
    path: "/timeline/stats",
    response: z.object({ data: z.any() }),
  },
  getEras: {
    method: "GET" as const,
    path: "/timeline/eras",
    response: z.object({ data: z.array(z.any()) }),
  },
} as const;

export type TimelineEndpoint = typeof TimelineEndpoint;
