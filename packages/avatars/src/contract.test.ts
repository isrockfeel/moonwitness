import { describe, expect, it } from "vitest";
import {
  AVATAR_STORAGE_VERSION,
  DEFAULT_AVATAR_OPTIONS,
  buildSavedAvatar,
  normalizeSeed,
  validateSavedAvatar,
  type SavedAvatarOptions,
} from "./contract";

const OPTIONS: SavedAvatarOptions = {
  palette: "moon",
  background: "paper",
  radius: 24,
  halftone: false,
  crown: true,
  moon: false,
  tape: true,
};

describe("avatar contract", () => {
  it("builds a versioned saved avatar from valid input", () => {
    const saved = buildSavedAvatar("Empire Admin", "Rezza", OPTIONS);
    expect(saved).not.toBeNull();
    expect(saved?.version).toBe(AVATAR_STORAGE_VERSION);
    expect(saved?.identity).toBe("Empire Admin");
    expect(saved?.seed).toBe("Rezza");
    expect(saved?.options).toEqual(OPTIONS);
    expect(typeof saved?.updatedAt).toBe("string");
  });

  it("normalizes blank and padded seeds", () => {
    expect(normalizeSeed("   ")).toBe("WITNESS");
    expect(normalizeSeed("  Rezza  ")).toBe("Rezza");
    expect(buildSavedAvatar("crew", "   ", OPTIONS)?.seed).toBe("WITNESS");
  });

  it("rejects unknown palette and background values", () => {
    expect(buildSavedAvatar("crew", "Rezza", { ...OPTIONS, palette: "neon" as never })).toBeNull();
    expect(
      buildSavedAvatar("crew", "Rezza", { ...OPTIONS, background: "void" as never }),
    ).toBeNull();
  });

  it("rejects non-finite radius", () => {
    expect(buildSavedAvatar("crew", "Rezza", { ...OPTIONS, radius: Number.NaN })).toBeNull();
    expect(buildSavedAvatar("crew", "Rezza", { ...OPTIONS, radius: Infinity })).toBeNull();
  });

  it("round-trips a built avatar through validation", () => {
    const saved = buildSavedAvatar("Empire Admin", "Rezza", OPTIONS);
    const validated = validateSavedAvatar(JSON.parse(JSON.stringify(saved)));
    expect(validated).toEqual(saved);
  });

  it("rejects payloads with a wrong storage version", () => {
    const saved = buildSavedAvatar("Empire Admin", "Rezza", OPTIONS)!;
    expect(validateSavedAvatar({ ...saved, version: 99 })).toBeNull();
  });

  it("rejects malformed payloads without throwing", () => {
    for (const bad of [null, undefined, 42, "str", [], {}]) {
      expect(validateSavedAvatar(bad)).toBeNull();
    }
  });

  it("rejects payloads with missing option fields", () => {
    const saved = buildSavedAvatar("Empire Admin", "Rezza", OPTIONS)!;
    const { radius: _radius, ...withoutRadius } = saved.options;
    expect(validateSavedAvatar({ ...saved, options: withoutRadius })).toBeNull();
    expect(
      validateSavedAvatar({ ...saved, options: { ...saved.options, tape: "yes" } }),
    ).toBeNull();
  });

  it("rejects empty identities", () => {
    const saved = buildSavedAvatar("Empire Admin", "Rezza", OPTIONS)!;
    expect(validateSavedAvatar({ ...saved, identity: "  " })).toBeNull();
  });

  it("defaults to a complete option set", () => {
    expect(DEFAULT_AVATAR_OPTIONS.palette).toBe("street");
    expect(DEFAULT_AVATAR_OPTIONS.background).toBe("ink");
    expect(buildSavedAvatar("crew", "x", DEFAULT_AVATAR_OPTIONS)).not.toBeNull();
  });
});
