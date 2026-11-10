import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Harus tetap sinkron dengan ART_SOURCES di src/optimize.ts — Node tidak bisa
// mengimpor file .ts dari skrip .mjs.
const ROOT = path.resolve(import.meta.dirname, "../../..");
const SOURCES = {
  "hero-witness": "apps/web/public/art/hero-witness.png",
  "city-shadow": "apps/web/public/art/city-shadow.png",
  "crew-rooftop": "apps/web/public/art/crew-rooftop.png",
  "signal-tunnel": "apps/web/public/art/signal-tunnel.png",
  "shadow-command": "apps/web/public/art/shadow-command.png",
};
const OUT_DIR = path.join(ROOT, "apps/web/public/art");
const WIDTHS = [480, 960, 1440, 1920];
const QUALITY = 62;

let made = 0;
for (const [key, rel] of Object.entries(SOURCES)) {
  const input = path.join(ROOT, rel);
  if (!existsSync(input)) {
    console.warn(`[skip] ${key}: sumber tidak ada (${rel})`);
    continue;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const w of WIDTHS) {
    const base = sharp(input).resize({ width: w, withoutEnlargement: true }).rotate();
    await base.clone().avif({ quality: QUALITY }).toFile(path.join(OUT_DIR, `${key}-${w}.avif`));
    await base.clone().webp({ quality: QUALITY }).toFile(path.join(OUT_DIR, `${key}-${w}.webp`));
    made += 2;
  }
  console.log(`[ok] ${key}: ${WIDTHS.length * 2} file`);
}
console.log(`Selesai. ${made} file ditulis ke ${path.relative(ROOT, OUT_DIR)}`);
