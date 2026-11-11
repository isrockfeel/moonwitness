import type { BackgroundName, PaletteName } from "./witness";

/**
 * Kontrak avatar yang tersimpan per identitas.
 *
 * Berversi — ubah versi ini untuk migrasi data lama.
 * Tervalidasi di batas penyimpanan: data yang tidak lolos validate dibuang,
 * identitas kembali ke avatar default (tanpa menyimpan kegagalan sebagai success).
 */
export const AVATAR_STORAGE_VERSION = 1;

export interface SavedAvatarOptions {
  palette: PaletteName;
  background: BackgroundName;
  radius: number;
  halftone: boolean;
  crown: boolean;
  moon: boolean;
  tape: boolean;
}

export const DEFAULT_AVATAR_OPTIONS: SavedAvatarOptions = {
  palette: "street",
  background: "ink",
  radius: 18,
  halftone: true,
  crown: true,
  moon: true,
  tape: false,
};

export interface SavedAvatar {
  version: typeof AVATAR_STORAGE_VERSION;
  identity: string;
  seed: string;
  options: SavedAvatarOptions;
  updatedAt: string;
}

const PALETTES: readonly PaletteName[] = ["street", "moon", "acid", "signal"];
const BACKGROUNDS: readonly BackgroundName[] = ["ink", "paper", "transparent"];

export function normalizeSeed(seed: string): string {
  const s = seed.trim();
  return s === "" ? "WITNESS" : s;
}

function isOneOf<T extends string>(value: unknown, list: readonly T[]): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
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
  if (!isOneOf(op.palette, PALETTES)) return null;
  if (!isOneOf(op.background, BACKGROUNDS)) return null;
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
  options: SavedAvatarOptions,
): SavedAvatar | null {
  if (!isOneOf(options.palette, PALETTES)) return null;
  if (!isOneOf(options.background, BACKGROUNDS)) return null;
  if (!Number.isFinite(options.radius)) return null;
  return {
    version: AVATAR_STORAGE_VERSION,
    identity,
    seed: normalizeSeed(seed),
    options: {
      palette: options.palette,
      background: options.background,
      radius: options.radius,
      halftone: options.halftone,
      crown: options.crown,
      moon: options.moon,
      tape: options.tape,
    },
    updatedAt: new Date().toISOString(),
  };
}
