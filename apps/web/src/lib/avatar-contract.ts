import type { BackgroundName, PaletteName } from "@moonwitness/avatars";

/**
 * Kontrak avatar yang tersimpan per identitas.
 *
 * Berversi — ubah versi ini untuk migrasi data lama.
 * Tervalidasi di batas penyimpanan: data yang tidak lolos validate dibuang,
 * identitas kembali ke avatar default (tanpa menyimpan kegagalan sebagai success).
 */
export const AVATAR_STORAGE_VERSION = 1;

export const DEFAULT_AVATAR_OPTIONS = {
  palette: "street",
  background: "ink",
  radius: 18,
  halftone: true,
  crown: true,
  moon: true,
  tape: false,
} as const satisfies Record<string, string | number | boolean>;

export interface SavedAvatar {
  version: typeof AVATAR_STORAGE_VERSION;
  identity: string;
  seed: string;
  options: {
    palette: PaletteName;
    background: BackgroundName;
    radius: number;
    halftone: boolean;
    crown: boolean;
    moon: boolean;
    tape: boolean;
  };
  updatedAt: string;
}

const PALETTES = ["street", "moon", "acid", "signal"] as const;
const BACKGROUNDS = ["ink", "paper", "transparent"] as const;

export function normalizeSeed(seed: string): string {
  const s = seed.trim();
  return s === "" ? "WITNESS" : s;
}

function isStringList(value: unknown, list: readonly string[]): value is string {
  return typeof value === "string" && list.includes(value);
}

export function validateSavedAvatar(raw: unknown): SavedAvatar | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== AVATAR_STORAGE_VERSION) return null;
  if (typeof r.identity !== "string" || r.identity.trim() === "") return null;
  if (typeof r.seed !== "string") return null;
  const o = r.options;
  if (!o || typeof o !== "object") return null;
  const op = o as Record<string, unknown>;
  if (!isStringList(op.palette, PALETTES)) return null;
  if (!isStringList(op.background, BACKGROUNDS)) return null;
  if (typeof op.radius !== "number" || !Number.isFinite(op.radius)) return null;
  if (typeof op.halftone !== "boolean") return null;
  if (typeof op.crown !== "boolean") return null;
  if (typeof op.moon !== "boolean") return null;
  if (typeof op.tape !== "boolean") return null;
  return {
    version: AVATAR_STORAGE_VERSION,
    identity: r.identity,
    seed: normalizeSeed(r.seed),
    options: {
      palette: op.palette,
      background: op.background,
      radius: op.radius,
      halftone: op.halftone,
      crown: op.crown,
      moon: op.moon,
      tape: op.tape,
    },
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export function buildSavedAvatar(
  identity: string,
  seed: string,
  options: Omit<SavedAvatar["options"], "palette" | "background"> & {
    palette?: string;
    background?: string;
  },
): SavedAvatar | null {
  const palette = options.palette;
  const background = options.background;
  if (!isStringList(palette, PALETTES) || !isStringList(background, BACKGROUNDS)) return null;
  return {
    version: AVATAR_STORAGE_VERSION,
    identity,
    seed: normalizeSeed(seed),
    options: {
      palette,
      background,
      radius: options.radius,
      halftone: options.halftone,
      crown: options.crown,
      moon: options.moon,
      tape: options.tape,
    },
    updatedAt: new Date().toISOString(),
  };
}