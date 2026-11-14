import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import catalogue from "../src/catalogue.json" with { type: "json" };
import { ART_SOURCES, ART_WIDTHS, effectiveWidths } from "../src/optimize.ts";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const OUT_DIR = path.join(ROOT, "apps/web/public/art");
const heroOnly = process.argv.includes("--hero-only");
const sources = heroOnly
  ? Object.values(catalogue.hero).map((layer) => ({
      ...layer,
      input: `apps/web/public${layer.source}`,
    }))
  : Object.entries(ART_SOURCES).map(([key, input]) => ({
      key,
      input,
      width: catalogue.legacySourceWidths[key],
    }));

// Preflight every hero master before writing anything; never flatten or replace inputs.
if (heroOnly) {
  for (const layer of sources) {
    const input = path.join(ROOT, layer.input);
    if (!existsSync(input)) throw new Error(`Missing hero master: ${input}`);
    const meta = await sharp(input).metadata();
    if (
      meta.width !== layer.width ||
      meta.height !== layer.height ||
      !!meta.hasAlpha !== layer.alpha
    ) {
      throw new Error(`Hero dimension/alpha mismatch: ${layer.key} ${JSON.stringify(meta)}`);
    }
    if (layer.alpha) {
      const { data, info } = await sharp(input)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const alphaAt = (x, y) => data[(y * info.width + x) * 4 + 3];
      if (alphaAt(10, 10) !== 0) throw new Error(`Hero exterior is not transparent: ${layer.key}`);
      if (layer.key === "hero-character-v2") {
        for (const [x, y] of [
          [460, 280],
          [460, 550],
          [220, 1080],
        ]) {
          const offset = (y * info.width + x) * 4;
          if (data[offset + 3] !== 255 || data[offset] < 180)
            throw new Error("Character white interiors must remain opaque");
        }
      }
    }
  }
}

let made = 0;
for (const layer of sources) {
  const input = path.join(ROOT, layer.input);
  if (!existsSync(input)) {
    console.warn(`[skip] ${layer.key}: source missing (${layer.input})`);
    continue;
  }
  const widths = heroOnly ? effectiveWidths(layer.width) : ART_WIDTHS;
  for (const width of widths) {
    const base = sharp(input).rotate().resize({ width, withoutEnlargement: true });
    for (const format of ["avif", "webp"]) {
      const output = path.join(OUT_DIR, `${layer.key}-${width}.${format}`);
      await base.clone()[format]({ quality: 62 }).toFile(output);
      const decoded = await sharp(output).metadata();
      const expectedWidth = Math.min(width, layer.width);
      if (
        decoded.width !== expectedWidth ||
        (heroOnly &&
          (decoded.height !== Math.round((layer.height * width) / layer.width) ||
            !!decoded.hasAlpha !== layer.alpha))
      ) {
        throw new Error(`Invalid decoded derivative: ${output}`);
      }
      console.log(
        `[ok] ${path.basename(output)} ${decoded.width}x${decoded.height} alpha=${!!decoded.hasAlpha}`,
      );
      made++;
    }
  }
}
console.log(`Done. ${made} files written to ${path.relative(ROOT, OUT_DIR)}`);
