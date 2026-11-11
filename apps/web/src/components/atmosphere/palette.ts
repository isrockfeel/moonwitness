export interface Palette {
  pink: string;
  blue: string;
  yellow: string;
  purple: string;
  green: string;
  ink: string;
  paper: string;
}

const FALLBACK: Palette = {
  pink: "#ff2d78",
  blue: "#2ea8ff",
  yellow: "#ffd21f",
  purple: "#a855f7",
  green: "#3ddc84",
  ink: "#0b0b10",
  paper: "#f4eede",
};

/** Baca palet zine dari CSS vars theme.css supaya atmosfer milik subjek, bukan palet asing. */
export function readPalette(el?: Element): Palette {
  const cs = getComputedStyle(el ?? document.documentElement);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    pink: v("--pink", FALLBACK.pink),
    blue: v("--blue", FALLBACK.blue),
    yellow: v("--yellow", FALLBACK.yellow),
    purple: v("--purple", FALLBACK.purple),
    green: v("--green", FALLBACK.green),
    ink: v("--ink", FALLBACK.ink),
    paper: v("--paper", FALLBACK.paper),
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [255, 45, 120];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
