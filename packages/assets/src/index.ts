import type { ArtKey } from "@moonwitness/types";
import { srcSetFor } from "./optimize";

export interface ArtEntry {
  /** PNG sumber di public/art — inilah yang dipakai next/image di apps/web. */
  source: string;
  /** AVIF 1440w — src default untuk <picture> di packages/ui. */
  src: string;
  srcSet: string;
  /** WebP 1440w — fallback bila browser tidak mendukung AVIF. */
  fallback: string;
  fallbackSrcSet: string;
  alt: string;
  position?: string;
  /** Nama file di packages/assets/references/ yang jadi acuan visualnya. */
  credit: string;
}

function entry(key: ArtKey, alt: string, position: string | undefined, credit: string): ArtEntry {
  return {
    source: `/art/${key}.png`,
    src: `/art/${key}-1440.avif`,
    srcSet: srcSetFor(key, "avif"),
    fallback: `/art/${key}-1440.webp`,
    fallbackSrcSet: srcSetFor(key, "webp"),
    alt,
    position,
    credit,
  };
}

export const ARTWORK = {
  "hero-witness": entry(
    "hero-witness",
    "Saksi berjaket magenta menatap bulan di atas kota neon",
    "30% center",
    "01-landing.png",
  ),
  "city-shadow": entry(
    "city-shadow",
    "Kota malam diselimuti bayangan dan papan neon magenta",
    "50% 40%",
    "03-shadow-login.png",
  ),
  "crew-rooftop": entry(
    "crew-rooftop",
    "Kru bertudung berdiri di atap gedung menghadap bulan raksasa biru",
    "50% center",
    "02-mission-control.png",
  ),
  "signal-tunnel": entry(
    "signal-tunnel",
    "Sosok tunggal berjalan masuk ke terowongan bercahaya merah",
    "center",
    "04-dock-timeline.png",
  ),
  "shadow-command": entry(
    "shadow-command",
    "Pusat komando bayangan: layar data di ruangan gelap menghadap kota neon",
    "50% 35%",
    "06-shadow-command-center.png",
  ),
} satisfies Record<ArtKey, ArtEntry>;

export { ART_SOURCES, ART_WIDTHS, outputNames } from "./optimize";
