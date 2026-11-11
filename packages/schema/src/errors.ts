import { z } from "zod";

export const ListTimelineQuerySchema = z.object({
  era: z.string().optional(),
  kind: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export type ListTimelineQuery = z.infer<typeof ListTimelineQuerySchema>;

export const TimelineEventListResponseSchema = z.object({
  data: z.array(z.any()),
  total: z.number().int(),
});

export type TimelineEventListResponse = z.infer<typeof TimelineEventListResponseSchema>;

export const TimelineEventResponseSchema = z.object({
  data: z.any(),
});

export type TimelineEventResponse = z.infer<typeof TimelineEventResponseSchema>;

export const TimelineStatsSchema = z.object({
  total: z.number().int(),
  byEra: z.record(z.string(), z.number().int()),
  byKind: z.record(z.string(), z.number().int()),
});

export type TimelineStats = z.infer<typeof TimelineStatsSchema>;

export const TimelineStatsResponseSchema = z.object({
  data: TimelineStatsSchema,
});

export type TimelineStatsResponse = z.infer<typeof TimelineStatsResponseSchema>;

export const EraListResponseSchema = z.object({
  data: z.array(z.any()),
});

export type EraListResponse = z.infer<typeof EraListResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
