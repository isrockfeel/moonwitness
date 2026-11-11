import { createAvatar as dicebearCreateAvatar } from "@dicebear/core";
import type { Options, Result, StyleOptions } from "@dicebear/core";
import { witness, type WitnessStyleOptions } from "./witness";

export {
  witness,
  WITNESS_PALETTES,
  WITNESS_BACKGROUNDS,
  PALETTES,
  type WitnessStyleOptions,
  type WitnessPalette,
  type PaletteName,
  type BackgroundName,
} from "./witness";

export type WitnessAvatarOptions = StyleOptions<WitnessStyleOptions>;

/** Avatar default MoonWitness: sistem DiceBear, style zine milik sendiri. */
export function createAvatar(options: WitnessAvatarOptions = {}): Result {
  return dicebearCreateAvatar(witness, options);
}

/** Seed → data URI siap dipakai di <img src>. */
export function avatarDataUri(
  seed: string,
  options: Omit<WitnessAvatarOptions, "seed"> = {},
): string {
  return createAvatar({ ...options, seed }).toDataUri();
}

export type { Options, Result };

export {
  AVATAR_STORAGE_VERSION,
  DEFAULT_AVATAR_OPTIONS,
  validateSavedAvatar,
  buildSavedAvatar,
  normalizeSeed,
  type SavedAvatar,
  type SavedAvatarOptions,
} from "./contract";
