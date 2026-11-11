import { describe, expect, it, vi } from "vitest";
import { AddonRegistry, AddonRegistryError, AddonManifestSchema } from "./registry.js";

function addon(name: string, depends: string[] = [], provides: Record<string, string[]> = {}) {
  return {
    manifest: { name, version: "0.1.0", depends, provides },
    register: vi.fn(async () => {}),
  };
}

describe("AddonManifestSchema", () => {
  it("applies defaults for optional provides/depends", () => {
    const parsed = AddonManifestSchema.parse({ name: "x", version: "1.0.0" });
    expect(parsed.depends).toEqual([]);
    expect(parsed.provides.routes).toEqual([]);
  });

  it("rejects an invalid addon name", () => {
    expect(() => AddonManifestSchema.parse({ name: "Bad Name", version: "1" })).toThrow();
  });
});

describe("AddonRegistry", () => {
  it("loads __base before a dependent addon", async () => {
    const registry = new AddonRegistry();
    const timeline = addon("timeline", ["__base"], { routes: ["timeline"] });
    const base = addon("__base", [], { routes: ["health"], models: ["users"] });
    registry.add(timeline).add(base);

    const loaded: string[] = [];
    base.register.mockImplementation(async () => void loaded.push("__base"));
    timeline.register.mockImplementation(async () => void loaded.push("timeline"));

    await registry.load();
    expect(loaded).toEqual(["__base", "timeline"]);
  });

  it("detects a missing dependency", () => {
    const registry = new AddonRegistry().add(addon("timeline", ["__base"]));
    expect(() => registry.resolveOrder()).toThrow(AddonRegistryError);
    expect(() => registry.resolveOrder()).toThrow(/Missing addon dependency '__base'/);
  });

  it("detects a dependency cycle", () => {
    const registry = new AddonRegistry().add(addon("a", ["b"])).add(addon("b", ["a"]));
    expect(() => registry.resolveOrder()).toThrow(/Circular addon dependency/);
  });

  it("rejects duplicate addon names", () => {
    const registry = new AddonRegistry().add(addon("a"));
    expect(() => registry.add(addon("a"))).toThrow(/Duplicate addon name/);
  });

  it("rejects route/model collisions across addons", () => {
    const registry = new AddonRegistry()
      .add(addon("a", [], { routes: ["shared"] }))
      .add(addon("b", [], { routes: ["shared"] }));
    expect(() => registry.validate()).toThrow(/already claimed/);
  });

  it("exposes the loaded set to each register callback", async () => {
    const registry = new AddonRegistry();
    let seen: string[] = [];
    registry.add(addon("__base")).add({
      manifest: { name: "timeline", version: "1", depends: ["__base"], provides: {} },
      register: (ctx) => {
        seen = ctx.loaded;
      },
    });
    await registry.load();
    expect(seen).toEqual(["__base"]);
  });
});
