import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { resolve } from "node:path";
import * as optimizer from "./optimize";
import * as catalogue from "./index";

const root = resolve(import.meta.dirname, "../../..");

describe("hero actual-width catalogue", () => {
  it("clamps, deduplicates and sorts requested widths", () => {
    expect(optimizer).toHaveProperty("effectiveWidths");
    const effectiveWidths = (
      optimizer as unknown as { effectiveWidths: (width: number, requested?: number[]) => number[] }
    ).effectiveWidths;
    expect(effectiveWidths(832)).toEqual([480, 832]);
    expect(effectiveWidths(1344)).toEqual([480, 960, 1344]);
    expect(effectiveWidths(1024)).toEqual([480, 960, 1024]);
    expect(effectiveWidths(32, [960, 480, 480])).toEqual([32]);
  });
  it("exports separate layers with authoritative dimensions and truthful srcsets", () => {
    expect(catalogue).toHaveProperty("HERO_LAYERS");
    const layers = (
      catalogue as unknown as {
        HERO_LAYERS: Record<
          string,
          {
            key: string;
            width: number;
            height: number;
            widths: number[];
            srcSet: string;
            source: string;
            alpha: boolean;
          }
        >;
      }
    ).HERO_LAYERS;
    expect(Object.keys(layers)).toEqual(["city", "moon", "character"]);
    for (const [role, width, height, widths] of [
      ["city", 1344, 768, [480, 960, 1344]],
      ["moon", 1024, 1024, [480, 960, 1024]],
      ["character", 832, 1248, [480, 832]],
    ] as const) {
      expect(layers[role]).toMatchObject({ width, height, widths });
      expect(layers[role]?.srcSet).toBe(optimizer.srcSetFor(`hero-${role}-v2`, "avif", widths));
    }
  });
  it("every published derivative decodes to its declared width/height and alpha", async () => {
    for (const layer of Object.values(catalogue.HERO_LAYERS)) {
      for (const derivative of layer.derivatives) {
        for (const format of ["avif", "webp"] as const) {
          const path = resolve(root, `apps/web/public${derivative[format]}`);
          const meta = await sharp(path).metadata();
          expect([meta.width, meta.height, !!meta.hasAlpha]).toEqual([
            derivative.width,
            derivative.height,
            layer.alpha,
          ]);
          if (layer.alpha) {
            const { data, info } = await sharp(path)
              .ensureAlpha()
              .raw()
              .toBuffer({ resolveWithObject: true });
            expect(data[(10 * info.width + 10) * 4 + 3]).toBeLessThanOrEqual(1);
            if (layer.key === "hero-character-v2") {
              for (const [x, y] of [
                [460, 280],
                [460, 550],
                [220, 1080],
              ] as const) {
                const px = Math.round((x * derivative.width) / layer.width);
                const py = Math.round((y * derivative.height) / layer.height);
                expect(data[(py * info.width + px) * 4 + 3]).toBeGreaterThanOrEqual(254);
              }
            }
          }
        }
      }
    }
  });
  it("accepted character has transparent exterior and opaque white face/shirt/hands", async () => {
    const { data, info } = await sharp(resolve(root, "apps/web/public/art/hero-character-v2.png"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) =>
      Array.from(data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4));
    expect([info.width, info.height]).toEqual([832, 1248]);
    expect(pixel(10, 10)[3]).toBe(0);
    for (const [x, y] of [
      [460, 280],
      [460, 550],
      [220, 1080],
    ] as const) {
      expect(pixel(x, y)[3]).toBe(255);
      expect(pixel(x, y)[0]).toBeGreaterThan(180);
    }
  });
  it("alpha codecs retain transparent exterior and opaque interiors on a tiny fixture", async () => {
    const rgba = Buffer.from([
      255, 255, 255, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0,
    ]);
    for (const format of ["avif", "webp"] as const) {
      const fixture = sharp(rgba, { raw: { width: 2, height: 2, channels: 4 } });
      const encoded = await fixture[format]({ quality: 62 }).toBuffer();
      const { data, info } = await sharp(encoded)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect([info.width, info.height]).toEqual([2, 2]);
      expect(data[3]).toBeLessThanOrEqual(1);
      expect(data[15]).toBeLessThanOrEqual(1);
      expect(data[7]).toBeGreaterThanOrEqual(254);
      expect(data[11]).toBeGreaterThanOrEqual(254);
    }
  });
});
