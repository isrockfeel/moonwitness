import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ART_SOURCES, ART_SOURCE_WIDTHS, effectiveWidths, outputNames } from "./optimize";
import { ARTWORK } from "./index";
import type { ArtKey } from "@moonwitness/types";

const KEYS = Object.keys(ARTWORK) as ArtKey[];

// ART_SOURCES berisi path relatif terhadap root repo. vitest bisa berjalan
// dengan cwd = packages/assets, jadi root diturunkan dari lokasi file ini,
// bukan dari process.cwd() — sama seperti ROOT di scripts/optimize.mjs.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("outputNames", () => {
  it("menghasilkan satu pasangan avif+webp per lebar, urut dari kecil", () => {
    expect(outputNames("hero-witness")).toEqual([
      "hero-witness-480.avif",
      "hero-witness-480.webp",
      "hero-witness-960.avif",
      "hero-witness-960.webp",
      "hero-witness-1440.avif",
      "hero-witness-1440.webp",
      "hero-witness-1920.avif",
      "hero-witness-1920.webp",
    ]);
  });

  it("menghormati daftar lebar kustom", () => {
    expect(outputNames("city-shadow", [960])).toEqual([
      "city-shadow-960.avif",
      "city-shadow-960.webp",
    ]);
  });
});

describe("ARTWORK manifest", () => {
  it("punya entri untuk setiap kunci artwork", () => {
    expect(KEYS.sort()).toEqual(
      [
        "city-shadow",
        "crew-rooftop",
        "crew-wall",
        "crowd-moon",
        "fog-voices",
        "hero-witness",
        "mirror-archive",
        "night-shift",
        "shadow-command",
        "signal-sky",
        "signal-tunnel",
      ].sort(),
    );
  });

  it("setiap kandidat srcSet memakai lebar yang sama dengan derivative yang didekode", async () => {
    for (const key of KEYS) {
      const entry = ARTWORK[key];
      for (const srcSet of [entry.srcSet, entry.fallbackSrcSet]) {
        const widths = new Set<number>();
        for (const candidate of srcSet.split(", ")) {
          const [url, descriptor] = candidate.split(" ");
          const width = Number(descriptor?.replace("w", ""));
          const metadata = await sharp(
            resolve(REPO_ROOT, "apps/web/public", url!.slice(1)),
          ).metadata();
          expect(metadata.width, `${key} ${url}`).toBe(width);
          expect(widths.has(width), `${key} duplicates ${width}w`).toBe(false);
          widths.add(width);
        }
        expect([...widths]).toEqual(effectiveWidths(ART_SOURCE_WIDTHS[key]));
      }
      expect(entry.source).toBe(`/art/${key}.png`);
      expect(entry.alt.length).toBeGreaterThan(20);
      expect(entry.credit).toMatch(/^0[1-6]-/);
    }
  });

  it("setiap kunci punya sumber PNG yang benar-benar ada di repo", async () => {
    const { existsSync } = await import("node:fs");
    for (const key of KEYS) {
      const abs = resolve(REPO_ROOT, ART_SOURCES[key]);
      expect(existsSync(abs), `${key} tidak ada di ${abs}`).toBe(true);
      const metadata = await sharp(abs).metadata();
      expect(metadata.width, `${key} source width`).toBe(ART_SOURCE_WIDTHS[key]);
    }
  });
});
