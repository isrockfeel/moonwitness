import type { ArtKey } from "@moonwitness/types";

export const ART_WIDTHS = [480, 960, 1440, 1920] as const;

/** Path PNG sumber relatif terhadap root repo. Input pipeline sharp. */
export const ART_SOURCES: Record<ArtKey, string> = {
  "hero-witness": "apps/web/public/art/hero-witness.png",
  "city-shadow": "apps/web/public/art/city-shadow.png",
  "crew-rooftop": "apps/web/public/art/crew-rooftop.png",
  "signal-tunnel": "apps/web/public/art/signal-tunnel.png",
  "shadow-command": "apps/web/public/art/shadow-command.png",
  "night-shift": "apps/web/public/art/night-shift.png",
  "signal-sky": "apps/web/public/art/signal-sky.png",
  "fog-voices": "apps/web/public/art/fog-voices.png",
  "mirror-archive": "apps/web/public/art/mirror-archive.png",
  "crew-wall": "apps/web/public/art/crew-wall.png",
  "crowd-moon": "apps/web/public/art/crowd-moon.png",
};

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
