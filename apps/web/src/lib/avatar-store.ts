import { useEffect, useState } from "react";
import {
  AVATAR_STORAGE_VERSION,
  DEFAULT_AVATAR_OPTIONS,
  type SavedAvatar,
  type SavedAvatarOptions,
  buildSavedAvatar,
  normalizeSeed,
  validateSavedAvatar,
} from "@moonwitness/avatars";

export const STORE_KEY = "mw-avatars";

/** Baca seluruh peta avatar dari localStorage (aman jika storage tidak tersedia). */
export function readStore(): Record<string, SavedAvatar> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, SavedAvatar> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const validated = validateSavedAvatar(v);
      if (validated && validated.identity === k) out[k] = validated;
    }
    return out;
  } catch {
    return {};
  }
}

/** Tulis peta avatar; mengembalikan true jika penyimpanan berhasil. */
export function writeStore(map: Record<string, SavedAvatar>): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

/** Fungsi murni: terapkan avatar untuk identity ke dalam peta yang ada. */
export function applyToStore(
  store: Record<string, SavedAvatar>,
  identity: string,
  seed: string,
  options: SavedAvatarOptions,
): { next: Record<string, SavedAvatar>; ok: boolean } {
  const built = buildSavedAvatar(identity, seed, options);
  if (!built) return { next: store, ok: false };
  const next = { ...store, [identity]: built };
  return { next, ok: writeStore(next) };
}

/** Fungsi murni: hapus avatar untuk identity dari peta yang ada. */
export function resetInStore(
  store: Record<string, SavedAvatar>,
  identity: string,
): { next: Record<string, SavedAvatar>; ok: boolean } {
  const next = { ...store };
  delete next[identity];
  return { next, ok: writeStore(next) };
}

export interface AvatarStore {
  saved: SavedAvatar | null;
  /** True ketika storage tidak tersedia atau write gagal — state tidak pernah optimis. */
  storageAvailable: boolean;
  apply: (seed: string, options: SavedAvatarOptions) => boolean;
  reset: () => boolean;
}

/**
 * Hook: baca avatar tersimpan untuk identity dan beri aksi apply/reset.
 * Sinkron antar-tab via storage event. Gagal penyimpanan dikembalikan sebagai false;
 * state tidak pernah menganggap tersimpan secara optimis.
 */
export function useAvatarStore(identity: string): AvatarStore {
  const [store, setStore] = useState<Record<string, SavedAvatar>>({});
  const [storageAvailable, setStorageAvailable] = useState(true);

  // Hydrate sekali; jangan timpa data yang sudah ada saat re-render ulang.
  useEffect(() => {
    setStore(readStore());
    setStorageAvailable(true);
  }, []);

  // Sinkron antar-tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key !== STORE_KEY) return;
      setStore(readStore());
      setStorageAvailable(true);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saved = store[identity] ?? null;

  function apply(seed: string, options: SavedAvatarOptions): boolean {
    const { next, ok } = applyToStore(store, identity, seed, options);
    if (ok) {
      setStore(next);
    } else {
      setStorageAvailable(false);
    }
    return ok;
  }

  function reset(): boolean {
    const { next, ok } = resetInStore(store, identity);
    if (ok) {
      setStore(next);
    } else {
      setStorageAvailable(false);
    }
    return ok;
  }

  return { saved, storageAvailable, apply, reset };
}

export function savedSeed(saved: SavedAvatar | null): string {
  return saved ? saved.seed : normalizeSeed("");
}

export function savedOptions(saved: SavedAvatar | null): SavedAvatarOptions {
  return saved ? saved.options : DEFAULT_AVATAR_OPTIONS;
}

/**
 * Hook ringan untuk topbar: hanya seed + options yang sedang tersimpan.
 */
export function useSavedAvatar(identity: string): {
  seed: string;
  options: SavedAvatarOptions;
} {
  const { saved } = useAvatarStore(identity);
  return { seed: savedSeed(saved), options: savedOptions(saved) };
}

export const MW_AVATAR_STORE_VERSION = AVATAR_STORAGE_VERSION;
export { normalizeSeed, DEFAULT_AVATAR_OPTIONS, type SavedAvatar, type SavedAvatarOptions };
