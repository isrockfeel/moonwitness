import { getDb } from "@moonwitness/orm";
import type { TimelineEvent, Era } from "@moonwitness/types";
import { timelineEventModel, timelineEraModel } from "./timeline-model";

export const eras: Era[] = [
  {
    id: "origins",
    name: "Origins",
    years: "2020-2022",
    tagline: "The first witnesses.",
    color: "#3b82f6",
  },
  {
    id: "neon",
    name: "Neon",
    years: "2022-2024",
    tagline: "City lights, signal glow.",
    color: "#ec4899",
  },
  {
    id: "fracture",
    name: "Fracture",
    years: "2024-2025",
    tagline: "The split.",
    color: "#f97316",
  },
  {
    id: "rebuilding",
    name: "Rebuilding",
    years: "2025-2026",
    tagline: "Walls back up.",
    color: "#10b981",
  },
  {
    id: "expansions",
    name: "Expansions",
    years: "2026-",
    tagline: "New orbits.",
    color: "#8b5cf6",
  },
];

export const events: TimelineEvent[] = [
  {
    id: "evt-001",
    kind: "PROJECT",
    date: "2021-03-12",
    era: "origins",
    title: "First Witness Station",
    excerpt: "We lit the first relay.",
    body: "The first station came online under a waxing moon.",
    location: "Rooftop, Sector 1",
    tags: ["station", "relay"],
    sources: 2,
    notes: 1,
    image: "hero-witness",
    related: ["evt-002"],
  },
  {
    id: "evt-002",
    kind: "STORY",
    date: "2022-08-21",
    era: "neon",
    title: "Signal in the Fog",
    excerpt: "A voice came through the static.",
    body: "We traced the call back to the old tunnel network.",
    location: "Tunnel 7",
    tags: ["signal", "voice"],
    sources: 4,
    notes: 2,
    image: "signal-tunnel",
    related: ["evt-001", "evt-003"],
  },
  {
    id: "evt-003",
    kind: "WORLD",
    date: "2024-02-09",
    era: "fracture",
    title: "The Fracture Opens",
    excerpt: "The grid split down the middle.",
    body: "Two cities went dark for three nights.",
    location: "The Divide",
    tags: ["grid", "blackout"],
    sources: 6,
    notes: 5,
    image: "shadow-command",
    related: ["evt-002", "evt-004"],
  },
  {
    id: "evt-004",
    kind: "PEOPLE",
    date: "2025-06-30",
    era: "rebuilding",
    title: "Crew on the Wall",
    excerpt: "Hands went back up on the roof.",
    body: "A new crew climbed the wall at dawn.",
    location: "Rooftop, Sector 1",
    tags: ["crew", "rebuild"],
    sources: 3,
    notes: 1,
    image: "crew-rooftop",
    related: ["evt-003", "evt-005"],
  },
  {
    id: "evt-005",
    kind: "RESEARCH",
    date: "2026-09-01",
    era: "expansions",
    title: "Mirror Archive",
    excerpt: "Records started reflecting themselves.",
    body: "We opened the archive and it opened back.",
    location: "Mirror Hall",
    tags: ["archive", "mirror"],
    sources: 5,
    notes: 3,
    image: "mirror-archive",
    related: ["evt-004"],
  },
];

/**
 * Seeds deterministic fixture rows with explicit business ids.
 * The ORM owns generated ids for runtime writes, so fixtures insert
 * directly with metadata columns to stay id-stable.
 */
export async function seedTimeline(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  for (const era of eras) {
    await db.run(
      `INSERT OR IGNORE INTO ${timelineEraModel.table}
       (id, name, years, tagline, color, create_date, write_date, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'seed')`,
      [era.id, era.name, era.years, era.tagline, era.color, now, now],
    );
  }

  for (const event of events) {
    await db.run(
      `INSERT OR IGNORE INTO ${timelineEventModel.table}
       (id, kind, date, era, title, excerpt, body, location, tags, sources, notes, image, imagePosition, related, create_date, write_date, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed')`,
      [
        event.id,
        event.kind,
        event.date,
        event.era,
        event.title,
        event.excerpt,
        event.body,
        event.location,
        JSON.stringify(event.tags),
        event.sources,
        event.notes,
        event.image,
        event.imagePosition ?? null,
        JSON.stringify(event.related),
        now,
        now,
      ],
    );
  }
}
