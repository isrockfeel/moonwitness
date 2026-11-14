import type { ArtKey } from "@moonwitness/types";

import catalogue from "./catalogue.json" with { type: "json" };

export const ART_WIDTHS: readonly number[] = catalogue.widths;
export const ART_SOURCES: Record<ArtKey, string> = catalogue.legacy;
export const ART_SOURCE_WIDTHS: Record<ArtKey, number> = catalogue.legacySourceWidths;

export function effectiveWidths(
  sourceWidth: number,
  requested: readonly number[] = ART_WIDTHS,
): number[] {
  if (
    !Number.isInteger(sourceWidth) ||
    sourceWidth <= 0 ||
    requested.some((w) => !Number.isInteger(w) || w <= 0)
  ) {
    throw new Error("Image widths must be positive integers");
  }
  return [...new Set(requested.map((w) => Math.min(w, sourceWidth)))].sort((a, b) => a - b);
}

export const ART_OUT_DIR = "apps/web/public/art";

/** Nama file output, urut lebar menaik, avif lalu webp. */
export function outputNames(key: string, widths: readonly number[] = ART_WIDTHS): string[] {
  return widths.flatMap((w) => [`${key}-${w}.avif`, `${key}-${w}.webp`]);
}

export function srcSetFor(
  key: string,
  ext: "avif" | "webp",
  widths: readonly number[] = ART_WIDTHS,
): string {
  return widths.map((w) => `/art/${key}-${w}.${ext} ${w}w`).join(", ");
}

export function legacySrcSetFor(key: string, ext: "avif" | "webp", sourceWidth: number): string {
  const candidates = new Map<number, number>();
  for (const filenameWidth of ART_WIDTHS) {
    candidates.set(Math.min(filenameWidth, sourceWidth), filenameWidth);
  }
  return [...candidates]
    .map(([width, filenameWidth]) => `/art/${key}-${filenameWidth}.${ext} ${width}w`)
    .join(", ");
}
