import type { Prng, Style } from "@dicebear/core";

export const PALETTES = ["street", "moon", "acid", "signal"] as const;
export type PaletteName = (typeof PALETTES)[number];

export interface WitnessPalette {
  name: PaletteName;
  label: string;
  bg: string;
  ink: string;
  face: string;
  accent: string;
  accent2: string;
  crown: string;
  jacket: string;
  hair: string;
}

export const WITNESS_PALETTES: Record<PaletteName, WitnessPalette> = {
  street: {
    name: "street",
    label: "Street Ink",
    bg: "#10101a",
    ink: "#0b0b10",
    face: "#f4eede",
    accent: "#ff2d78",
    accent2: "#2ea8ff",
    crown: "#ffd21f",
    jacket: "#1c1c28",
    hair: "#2ea8ff",
  },
  moon: {
    name: "moon",
    label: "Moon Signal",
    bg: "#0c1220",
    ink: "#0b0b10",
    face: "#f4eede",
    accent: "#2ea8ff",
    accent2: "#ff2d78",
    crown: "#ffd21f",
    jacket: "#152238",
    hair: "#ff2d78",
  },
  acid: {
    name: "acid",
    label: "Acid Riot",
    bg: "#131a10",
    ink: "#0b0b10",
    face: "#f4eede",
    accent: "#a855f7",
    accent2: "#ffd21f",
    crown: "#ffd21f",
    jacket: "#221a30",
    hair: "#ffd21f",
  },
  signal: {
    name: "signal",
    label: "Signal Yellow",
    bg: "#181410",
    ink: "#0b0b10",
    face: "#f4eede",
    accent: "#ffd21f",
    accent2: "#ff2d78",
    crown: "#ffd21f",
    jacket: "#2a2118",
    hair: "#a855f7",
  },
};

export const WITNESS_BACKGROUNDS = ["ink", "paper", "transparent"] as const;
export type BackgroundName = (typeof WITNESS_BACKGROUNDS)[number];

export interface WitnessStyleOptions {
  palette?: PaletteName;
  background?: BackgroundName;
  halftone?: boolean;
  crown?: boolean;
  moon?: boolean;
  tape?: boolean;
}

interface Traits {
  palette: WitnessPalette;
  background: BackgroundName;
  halftone: boolean;
  crown: boolean;
  moon: boolean;
  tape: boolean;
  hood: number;
  hair: number;
  eyes: number;
  mouth: number;
  accessory: number;
  tilt: number;
}

function resolvePalette(prng: Prng, value: PaletteName | undefined): WitnessPalette {
  if (value && value in WITNESS_PALETTES) return WITNESS_PALETTES[value];
  return WITNESS_PALETTES[prng.pick([...PALETTES], "street")];
}

function drawTraits(prng: Prng, options: WitnessStyleOptions): Traits {
  const palette = resolvePalette(prng, options.palette);
  const background =
    options.background && WITNESS_BACKGROUNDS.includes(options.background)
      ? options.background
      : "ink";
  const hood = prng.integer(0, 3);
  const hair = prng.integer(0, 4);
  const eyes = prng.integer(0, 3);
  const mouth = prng.integer(0, 3);
  const accessory = prng.integer(0, 3);
  const tilt = prng.integer(-2, 2);
  return {
    palette,
    background,
    halftone: options.halftone ?? true,
    crown: options.crown ?? prng.bool(60),
    moon: options.moon ?? prng.bool(75),
    tape: options.tape ?? prng.bool(45),
    hood,
    hair,
    eyes,
    mouth,
    accessory,
    tilt,
  };
}

const PAPER = "#f4eede";
const PAPER_INK = "#16161f";

function bgLayer(t: Traits): string {
  if (t.background === "transparent") return "";
  const fill = t.background === "paper" ? PAPER : t.palette.bg;
  return `<rect width="128" height="128" fill="${fill}"/>`;
}

function moonLayer(t: Traits): string {
  if (!t.moon) return "";
  const onPaper = t.background === "paper";
  const fill = onPaper ? t.palette.accent : t.palette.accent2;
  const shadow = t.background === "paper" ? PAPER : t.palette.bg;
  const craters = onPaper ? PAPER : t.palette.bg;
  return (
    `<g opacity="${onPaper ? 0.9 : 0.8}">` +
    `<circle cx="102" cy="26" r="16" fill="${fill}"/>` +
    `<circle cx="96" cy="22" r="15" fill="${shadow}"/>` +
    `<circle cx="108" cy="31" r="2.4" fill="${craters}" opacity="0.55"/>` +
    `<circle cx="112" cy="24" r="1.5" fill="${craters}" opacity="0.55"/>` +
    `</g>`
  );
}

function sparkLayer(t: Traits): string {
  const c = t.background === "paper" ? t.palette.ink : t.palette.crown;
  return (
    `<g fill="${c}" opacity="0.85">` +
    `<path d="M18 30l1.8 4.2L24 36l-4.2 1.8L18 42l-1.8-4.2L12 36l4.2-1.8z"/>` +
    `<path d="M104 84l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z"/>` +
    `<circle cx="26" cy="70" r="1.4"/>` +
    `<circle cx="112" cy="58" r="1.2"/>` +
    `</g>`
  );
}

function hoodBack(t: Traits): string {
  const { jacket, ink } = t.palette;
  switch (t.hood) {
    case 0:
      return `<path d="M22 128c-2-30 6-56 18-66 8-7 36-7 48 0 12 10 20 36 18 66z" fill="${jacket}" stroke="${ink}" stroke-width="3"/>`;
    case 1:
      return `<path d="M18 128l6-52 14-14h52l14 14 6 52z" fill="${jacket}" stroke="${ink}" stroke-width="3"/>`;
    case 2:
      return `<path d="M20 128c-4-26 4-48 16-58l10-8h36l10 8c12 10 20 32 16 58z" fill="${jacket}" stroke="${ink}" stroke-width="3"/>`;
    default:
      return "";
  }
}

function headLayer(t: Traits): string {
  const { face, ink } = t.palette;
  return `<path d="M40 52c0-16 10-26 24-26s24 10 24 26v18c0 15-10 25-24 25S40 85 40 70z" fill="${face}" stroke="${ink}" stroke-width="3"/>`;
}

function hairLayer(t: Traits): string {
  const { hair, ink, accent } = t.palette;
  const stroke = `stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"`;
  switch (t.hair) {
    case 0:
      return `<path d="M38 54l7-14 5 8 6-16 6 12 6-14 6 14 5-9 7 13c-8-6-14-8-24-8s-17 3-24 8z" fill="${hair}" ${stroke}/>`;
    case 1:
      return `<path d="M38 52c0-16 11-25 26-25s26 9 26 25l-7-3-5 5-6-7-8 6-8-6-6 7-5-5z" fill="${hair}" ${stroke}/>`;
    case 2:
      return (
        `<path d="M37 56c-1-18 12-29 27-29s28 11 27 29l-6-2c1-13-9-21-21-21s-22 8-21 21z" fill="${hair}" ${stroke}/>` +
        `<rect x="35" y="50" width="8" height="14" rx="3" fill="${accent}" ${stroke}/>` +
        `<rect x="85" y="50" width="8" height="14" rx="3" fill="${accent}" ${stroke}/>`
      );
    case 3:
      return `<path d="M56 30c2-9 14-9 16 0l-2 14h-12z" fill="${hair}" ${stroke}/><path d="M42 46c4-8 10-12 22-12s18 4 22 12c-7-4-14-6-22-6s-15 2-22 6z" fill="${hair}" ${stroke}/>`;
    default:
      return `<path d="M38 52c0-16 11-25 26-25s26 9 26 25l-5-2c-2-12-10-18-21-18s-19 6-21 18z" fill="${hair}" ${stroke}/>`;
  }
}

function eyesLayer(t: Traits): string {
  const { ink, accent } = t.palette;
  switch (t.eyes) {
    case 0:
      return `<circle cx="53" cy="66" r="3" fill="${ink}"/><circle cx="75" cy="66" r="3" fill="${ink}"/>`;
    case 1:
      return `<path d="M48 66h10M70 66h10" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
    case 2:
      return `<circle cx="53" cy="66" r="3" fill="${ink}"/><path d="M70 67h10" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
    default:
      return (
        `<rect x="42" y="59" width="44" height="13" rx="6.5" fill="${ink}"/>` +
        `<circle cx="53" cy="65.5" r="2.2" fill="${accent}"/><circle cx="75" cy="65.5" r="2.2" fill="${accent}"/>`
      );
  }
}

function browsLayer(t: Traits): string {
  const { ink } = t.palette;
  return `<path d="M47 56l12-2M69 54l12 2" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
}

function mouthLayer(t: Traits): string {
  const { ink, accent } = t.palette;
  switch (t.mouth) {
    case 0:
      return `<path d="M55 82c5 5 13 5 18 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 1:
      return `<path d="M53 80h22c0 8-6 12-11 12s-11-4-11-12z" fill="${ink}"/><path d="M58 89c3 3 9 3 12 0l-2-3h-8z" fill="${accent}"/>`;
    case 2:
      return `<path d="M56 84h16" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
    default:
      return `<path d="M54 82c4 6 16 6 20 0l-2-2c-4 4-12 4-16 0z" fill="${ink}"/>`;
  }
}

function accessoryLayer(t: Traits): string {
  const { ink, accent, crown } = t.palette;
  switch (t.accessory) {
    case 0:
      return "";
    case 1:
      return `<path d="M87 76l4 6-4 6-4-6z" fill="${accent}" stroke="${ink}" stroke-width="2"/>`;
    case 2:
      return `<path d="M44 76l8-3M44 82l8-3" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>`;
    default:
      return `<circle cx="64" cy="74" r="2" fill="${ink}"/><circle cx="60" cy="76" r="1.2" fill="${crown}"/><circle cx="68" cy="76" r="1.2" fill="${crown}"/>`;
  }
}

function crownLayer(t: Traits): string {
  if (!t.crown) return "";
  const { crown, ink, accent } = t.palette;
  return (
    `<g transform="rotate(-8 84 24)">` +
    `<path d="M72 30l4-14 8 8 8-8 4 14z" fill="${crown}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<circle cx="76" cy="16" r="2" fill="${accent}"/><circle cx="84" cy="12" r="2" fill="${accent}"/><circle cx="92" cy="16" r="2" fill="${accent}"/>` +
    `</g>`
  );
}

function hoodFront(t: Traits): string {
  const { jacket, ink, accent } = t.palette;
  if (t.hood === 0) {
    return `<path d="M36 74c-3-24 8-40 28-40s31 16 28 40l-7 2c2-20-7-32-21-32s-23 12-21 32z" fill="${jacket}" stroke="${ink}" stroke-width="3"/>`;
  }
  if (t.hood === 2) {
    return `<path d="M30 106l14-10h40l14 10-8 22H38z" fill="${jacket}" stroke="${ink}" stroke-width="3"/><path d="M56 100v16M72 100v16" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  return "";
}

function jacketLayer(t: Traits): string {
  const { jacket, ink, accent, accent2 } = t.palette;
  const base = `<path d="M24 128c2-18 12-28 26-31l14 8 14-8c14 3 24 13 26 31z" fill="${jacket}" stroke="${ink}" stroke-width="3"/>`;
  const collar = `<path d="M50 99l14 10 14-10" fill="none" stroke="${ink}" stroke-width="3"/>`;
  const zip = `<path d="M64 109v19" stroke="${accent}" stroke-width="2.5" stroke-dasharray="3 2.5"/>`;
  const patch = `<path d="M88 116l2.2 4.6 4.8.7-3.5 3.4.8 4.9-4.3-2.3-4.3 2.3.8-4.9-3.5-3.4 4.8-.7z" fill="${accent2}" stroke="${ink}" stroke-width="1.5"/>`;
  return base + collar + zip + patch;
}

function halftoneLayer(t: Traits): string {
  if (!t.halftone) return "";
  const dot = t.background === "paper" ? t.palette.ink : t.palette.accent;
  return `<rect width="128" height="128" fill="url(#wHalftone)" opacity="${t.background === "paper" ? 0.14 : 0.22}"/>`;
}

function defs(t: Traits): string {
  const dot = t.background === "paper" ? t.palette.ink : t.palette.accent;
  return (
    `<defs>` +
    `<pattern id="wHalftone" width="8" height="8" patternUnits="userSpaceOnUse">` +
    `<circle cx="2" cy="2" r="1.1" fill="${dot}"/>` +
    `</pattern>` +
    `</defs>`
  );
}

function tapeLayer(t: Traits): string {
  if (!t.tape) return "";
  const { crown } = t.palette;
  return `<g transform="rotate(-6 20 14)" opacity="0.85"><rect x="6" y="8" width="30" height="11" fill="${crown}"/><path d="M6 8l4 11M32 8l4 11" stroke="#0b0b10" stroke-width="1" opacity="0.3"/></g>`;
}

function stickerLayer(t: Traits): string {
  const onPaper = t.background === "paper";
  const border = onPaper ? PAPER_INK : "#f4eede";
  return `<rect x="1.5" y="1.5" width="125" height="125" rx="10" fill="none" stroke="${border}" stroke-width="2" stroke-dasharray="7 4" opacity="0.5"/>`;
}

export const witness: Style<WitnessStyleOptions> = {
  meta: {
    title: "MoonWitness Witness",
    creator: "MoonWitness",
    license: { name: "MIT", url: "https://github.com/dicebear/dicebear/blob/main/LICENSE" },
    source: "https://github.com/dicebear/dicebear",
  },
  schema: {
    $schema: "http://json-schema.org/draft-07/schema#",
    properties: {
      palette: { type: "string", enum: [...PALETTES] },
      background: { type: "string", enum: [...WITNESS_BACKGROUNDS], default: "ink" },
      halftone: { type: "boolean", default: true },
      crown: { type: "boolean" },
      moon: { type: "boolean" },
      tape: { type: "boolean" },
    },
  },
  create: ({ prng, options }) => {
    const t = drawTraits(prng, options);
    const body =
      bgLayer(t) +
      moonLayer(t) +
      sparkLayer(t) +
      `<g transform="rotate(${t.tilt} 64 78)">` +
      hoodBack(t) +
      headLayer(t) +
      hairLayer(t) +
      browsLayer(t) +
      eyesLayer(t) +
      mouthLayer(t) +
      accessoryLayer(t) +
      hoodFront(t) +
      jacketLayer(t) +
      crownLayer(t) +
      `</g>` +
      halftoneLayer(t) +
      tapeLayer(t) +
      stickerLayer(t);
    return {
      attributes: { viewBox: "0 0 128 128" },
      body: defs(t) + body,
    };
  },
};