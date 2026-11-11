import { z } from "zod";
import { EraSchema, TimelineEventSchema } from "@moonwitness/schema/timeline";

/** Canonical error envelope shared by every API operation. */
export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Query filters for listing timeline events. Validated at the boundary. */
export const TimelineListQuerySchema = z
  .object({
    era: z.string().min(1).optional(),
    kind: z.string().min(1).optional(),
    from: z.string().min(1).optional(),
    to: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strict();
export type TimelineListQuery = z.infer<typeof TimelineListQuerySchema>;

export const TimelineListResponseSchema = z.object({
  data: z.array(TimelineEventSchema),
  total: z.number().int().nonnegative(),
});
export type TimelineListResponse = z.infer<typeof TimelineListResponseSchema>;

export const TimelineEventResponseSchema = z.object({
  data: TimelineEventSchema,
});
export type TimelineEventResponse = z.infer<typeof TimelineEventResponseSchema>;

export const TimelineStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  byEra: z.record(z.number().int().nonnegative()),
  byKind: z.record(z.number().int().nonnegative()),
});
export type TimelineStats = z.infer<typeof TimelineStatsSchema>;

export const TimelineStatsResponseSchema = z.object({
  data: TimelineStatsSchema,
});
export type TimelineStatsResponse = z.infer<typeof TimelineStatsResponseSchema>;

export const TimelineErasResponseSchema = z.object({
  data: z.array(EraSchema),
});
export type TimelineErasResponse = z.infer<typeof TimelineErasResponseSchema>;

export const TimelineEndpoint = {
  listEvents: {
    method: "GET" as const,
    path: "/timeline/events",
    query: TimelineListQuerySchema,
    response: TimelineListResponseSchema,
  },
  getEvent: {
    method: "GET" as const,
    path: "/timeline/events/:id",
    params: z.object({ id: z.string().min(1) }),
    response: TimelineEventResponseSchema,
  },
  getStats: {
    method: "GET" as const,
    path: "/timeline/stats",
    response: TimelineStatsResponseSchema,
  },
  getEras: {
    method: "GET" as const,
    path: "/timeline/eras",
    response: TimelineErasResponseSchema,
  },
} as const;

export type TimelineEndpoint = typeof TimelineEndpoint;
