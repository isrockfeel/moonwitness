import type { EventKind } from "@moonwitness/types";

/** Warna per jenis sinyal. Milik design system, bukan data. */
export const kindColors: Record<EventKind, string> = {
  PROJECT: "#ff2d78",
  STORY: "#2ea8ff",
  SIGNAL: "#ffd21f",
  WORLD: "#a855f7",
  PEOPLE: "#ff2d78",
  RESEARCH: "#2ea8ff",
};
