import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ART_SOURCES, ART_WIDTHS, outputNames } from "./optimize";
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
      ["city-shadow", "crew-rooftop", "hero-witness", "shadow-command", "signal-tunnel"].sort(),
    );
  });

  it("setiap entri merujuk srcSet yang memuat semua lebar", () => {
    for (const key of KEYS) {
      const entry = ARTWORK[key];
      for (const w of ART_WIDTHS) {
        expect(entry.srcSet).toContain(`${key}-${w}.avif ${w}w`);
        expect(entry.fallbackSrcSet).toContain(`${key}-${w}.webp ${w}w`);
      }
      expect(entry.source).toBe(`/art/${key}.png`);
      expect(entry.src).toBe(`/art/${key}-1440.avif`);
      expect(entry.fallback).toBe(`/art/${key}-1440.webp`);
      expect(entry.alt.length).toBeGreaterThan(20);
      expect(entry.credit).toMatch(/^0[1-6]-/);
    }
  });

  it("setiap kunci punya sumber PNG yang benar-benar ada di repo", async () => {
    const { existsSync } = await import("node:fs");
    for (const key of KEYS) {
      const abs = resolve(REPO_ROOT, ART_SOURCES[key]);
      expect(existsSync(abs), `${key} tidak ada di ${abs}`).toBe(true);
    }
  });
});
