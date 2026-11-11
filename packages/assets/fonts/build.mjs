// Saksi font build — assembles the proprietary MoonWitness type family.
// Run: pnpm --filter @moonwitness/assets fonts
// Original work, (c) 2026 MoonWitness. See LICENSE.txt.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import wawoff2 from "wawoff2";
import { GLYPHS, NOTDEF, KERN_PAIRS } from "./skeletons.mjs";
import { drawGlyph } from "./pens.mjs";
import { injectKern } from "./sfnt-kern.mjs";

const { Font, Glyph, Path, parse } = opentype;

const ROOT = path.resolve(import.meta.dirname, "../../..");
const WEB_DIR = path.join(ROOT, "apps/web/public/fonts");
const MASTER_DIR = path.join(ROOT, "packages/assets/fonts/masters");

const COPYRIGHT = "Copyright (c) 2026 MoonWitness. All rights reserved.";
const LICENSE =
  "Proprietary font. This font software is the exclusive property of MoonWitness. " +
  "Use is permitted only within MoonWitness products and marketing. " +
  "No redistribution, modification, sublicensing, or resale without written permission.";
const VERSION = "Version 1.000";

const VOICES = [
  { pen: "marker", family: "Saksi Marker", file: "saksi-marker", weights: [400, 700] },
  { pen: "hand", family: "Saksi Hand", file: "saksi-hand", weights: [400, 700] },
  { pen: "mono", family: "Saksi Mono", file: "saksi-mono", weights: [400, 700], fixed: true },
];

const AGL = {
  " ": "space",
  "!": "exclam",
  '"': "quotedbl",
  "#": "numbersign",
  $: "dollar",
  "%": "percent",
  "&": "ampersand",
  "'": "quotesingle",
  "(": "parenleft",
  ")": "parenright",
  "*": "asterisk",
  "+": "plus",
  ",": "comma",
  "-": "hyphen",
  ".": "period",
  "/": "slash",
  ":": "colon",
  ";": "semicolon",
  "<": "less",
  "=": "equal",
  ">": "greater",
  "?": "question",
  "@": "at",
  "[": "bracketleft",
  "\\": "backslash",
  "]": "bracketright",
  "^": "asciicircum",
  _: "underscore",
  "`": "grave",
  "{": "braceleft",
  "|": "bar",
  "}": "braceright",
  "~": "asciitilde",
};

function glyphName(char) {
  if (AGL[char]) return AGL[char];
  if (/^[A-Za-z0-9]$/.test(char)) return char;
  return "uni" + char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
}

function ringsToPath(rings) {
  const p = new Path();
  for (const r of rings) {
    if (r.length < 3) continue;
    p.moveTo(Math.round(r[0][0]), Math.round(r[0][1]));
    for (let i = 1; i < r.length; i++) p.lineTo(Math.round(r[i][0]), Math.round(r[i][1]));
    p.closePath();
  }
  return p;
}

async function buildVoice(voice) {
  for (const weight of voice.weights) {
    const style = weight === 700 ? "Bold" : "Regular";
    const glyphs = [];
    const indexOf = new Map();
    let winTop = 820;
    let winBottom = 240;

    const notdef = drawGlyph(".notdef", NOTDEF, voice.pen, weight);
    glyphs.push(
      new Glyph({ name: ".notdef", advanceWidth: notdef.advance, path: ringsToPath(notdef.rings) }),
    );

    for (const [char, def] of Object.entries(GLYPHS)) {
      const drawn = drawGlyph(char, def, voice.pen, weight, { slashedZero: !!voice.fixed });
      if (drawn.bbox) {
        winTop = Math.max(winTop, drawn.bbox[3]);
        winBottom = Math.max(winBottom, -drawn.bbox[1]);
      }
      indexOf.set(char, glyphs.length);
      glyphs.push(
        new Glyph({
          name: glyphName(char),
          unicode: char.codePointAt(0),
          advanceWidth: drawn.advance,
          path: ringsToPath(drawn.rings),
        }),
      );
    }

    const font = new Font({
      familyName: voice.family,
      styleName: style,
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      weightClass: weight,
      fsSelection: (weight === 700 ? 0x20 : 0x40) | 0x80,
      designer: "MoonWitness Design",
      manufacturer: "MoonWitness Type Foundry",
      copyright: COPYRIGHT,
      license: LICENSE,
      version: VERSION,
      description:
        "Saksi is the proprietary type family of MoonWitness, drawn from original " +
        "centerline skeletons with three pens: Marker (zine display), Hand (margin " +
        "notes), Mono (interface and data). Same moon, same hand.",
      glyphs,
    });

    const voiceTitle = voice.pen[0].toUpperCase() + voice.pen.slice(1);
    for (const platform of ["unicode", "macintosh", "windows"]) {
      font.names[platform].preferredFamily = { en: "Saksi" };
      font.names[platform].preferredSubfamily = { en: `${voiceTitle} ${style}` };
      font.names[platform].uniqueID = {
        en: `MoonWitnessTypeFoundry: ${voice.family} ${style}: 2026`,
      };
    }

    Object.assign(font.tables.os2, {
      usWeightClass: weight,
      usWidthClass: 5,
      fsSelection: (weight === 700 ? 0x20 : 0x40) | 0x80,
      sTypoAscender: 820,
      sTypoDescender: -220,
      sTypoLineGap: 0,
      usWinAscent: Math.ceil(winTop + 20),
      usWinDescent: Math.ceil(winBottom + 20),
    });
    if (voice.fixed) {
      font.tables.os2.panose = [2, 11, 6, 9, 2, 2, 2, 2, 2, 4];
      (font.tables.post ??= {}).isFixedPitch = 1;
    }

    let otf = Buffer.from(font.toArrayBuffer());
    if (!voice.fixed) {
      const pairs = [];
      for (const [pair, value] of Object.entries(KERN_PAIRS)) {
        if (pair.length === 2 && indexOf.has(pair[0]) && indexOf.has(pair[1])) {
          pairs.push({ left: indexOf.get(pair[0]), right: indexOf.get(pair[1]), value });
        }
      }
      otf = injectKern(otf, pairs);
    }
    const woff2 = Buffer.from(await wawoff2.compress(otf));

    const base = `${voice.file}-${weight}`;
    writeFileSync(path.join(MASTER_DIR, `${base}.otf`), otf);
    writeFileSync(path.join(WEB_DIR, `${base}.woff2`), woff2);

    // Self-check: reparse the master and verify coverage, metrics, kerning.
    const check = parse(otf.buffer.slice(otf.byteOffset, otf.byteOffset + otf.byteLength));
    const probes = ["A", "a", "0", "ã", "→", "…", "✓"];
    const missing = probes.filter((c) => check.charToGlyphIndex(c) === 0);
    if (missing.length) throw new Error(`${base}: missing glyphs ${missing.join(" ")}`);
    if (check.glyphs.length !== glyphs.length) throw new Error(`${base}: glyph count mismatch`);
    if (!voice.fixed && Object.keys(check.kerningPairs ?? {}).length === 0) {
      throw new Error(`${base}: kern table missing after injection`);
    }

    console.log(
      `[ok] ${base}: ${glyphs.length} glyphs, otf ${(otf.length / 1024).toFixed(1)} KB, woff2 ${(woff2.length / 1024).toFixed(1)} KB`,
    );
  }
}

mkdirSync(WEB_DIR, { recursive: true });
mkdirSync(MASTER_DIR, { recursive: true });
for (const voice of VOICES) await buildVoice(voice);
console.log(
  `Selesai. WOFF2 -> ${path.relative(ROOT, WEB_DIR)}, master OTF -> ${path.relative(ROOT, MASTER_DIR)}`,
);
