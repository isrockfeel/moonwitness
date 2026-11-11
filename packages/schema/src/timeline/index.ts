import { z } from "zod";
import type {
  ArtKey,
  Era,
  EraId,
  EventKind,
  TimelineEvent,
} from "@moonwitness/types";

export const ArtKeySchema = z.enum([
  "hero-witness",
  "city-shadow",
  "crew-rooftop",
  "signal-tunnel",
  "shadow-command",
]) satisfies z.ZodType<ArtKey>;

export const EraIdSchema = z.enum([
  "origins",
  "neon",
  "fracture",
  "rebuilding",
  "expansions",
]) satisfies z.ZodType<EraId>;

export const EventKindSchema = z.enum([
  "PROJECT",
  "STORY",
  "SIGNAL",
  "WORLD",
  "PEOPLE",
  "RESEARCH",
]) satisfies z.ZodType<EventKind>;

export const EraSchema = z.object({
  id: EraIdSchema,
  name: z.string(),
  years: z.string(),
  tagline: z.string(),
  color: z.string(),
}) satisfies z.ZodType<Era>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  kind: EventKindSchema,
  date: z.string(),
  era: EraIdSchema,
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
  location: z.string(),
  tags: z.array(z.string()),
  sources: z.number().int().nonnegative(),
  notes: z.number().int().nonnegative(),
  image: ArtKeySchema,
  imagePosition: z.string().optional(),
  related: z.array(z.string()),
}) satisfies z.ZodType<TimelineEvent>;