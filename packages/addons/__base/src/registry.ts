import { z } from "zod";

/**
 * Addon manifest contract. Every addon declares its identity, dependencies and
 * what it provides so the registry can load it deterministically.
 */
export const AddonManifestSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z_][a-z0-9_-]*$/, "addon name must be lowercase alphanumeric with _ or -"),
  version: z.string().min(1),
  description: z.string().optional(),
  depends: z.array(z.string().min(1)).default([]),
  provides: z
    .object({
      routes: z.array(z.string().min(1)).default([]),
      models: z.array(z.string().min(1)).default([]),
      migrations: z.array(z.string().min(1)).default([]),
      seeds: z.array(z.string().min(1)).default([]),
      permissions: z.array(z.string().min(1)).default([]),
      auditActions: z.array(z.string().min(1)).default([]),
    })
    .default({}),
});
export type AddonManifest = z.infer<typeof AddonManifestSchema>;

export interface RegisteredAddon {
  manifest: AddonManifest;
  /** The addon's registration callback, invoked in dependency order. */
  register: (ctx: AddonContext) => Promise<void> | void;
}

export interface AddonContext {
  /** Names of addons already registered before this one. */
  loaded: string[];
  /** Merge-safe registry state owned by the caller. */
  state: RegistryState;
}

export interface RegistryState {
  routes: Set<string>;
  models: Set<string>;
  migrations: Set<string>;
  seeds: Set<string>;
  permissions: Set<string>;
}

export class AddonRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AddonRegistryError";
  }
}

function emptyState(): RegistryState {
  return {
    routes: new Set(),
    models: new Set(),
    migrations: new Set(),
    seeds: new Set(),
    permissions: new Set(),
  };
}

/**
 * Deterministic addon registry: validates manifests, detects duplicate names,
 * missing dependencies and cycles, and loads addons in topological order.
 * Provided routes/models/migrations/seeds/permissions must not collide across
 * addons; a collision fails startup with an actionable error.
 */
export class AddonRegistry {
  private readonly addons = new Map<string, RegisteredAddon>();

  add(addon: RegisteredAddon): this {
    const parsed = AddonManifestSchema.parse(addon.manifest);
    if (this.addons.has(parsed.name)) {
      throw new AddonRegistryError(`Duplicate addon name '${parsed.name}'.`);
    }
    this.addons.set(parsed.name, { manifest: parsed, register: addon.register });
    return this;
  }

  /** Resolve load order via DFS; throws on missing dependency or cycle. */
  resolveOrder(): string[] {
    const order: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (name: string, path: string[]) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new AddonRegistryError(`Circular addon dependency: ${[...path, name].join(" -> ")}.`);
      }
      const addon = this.addons.get(name);
      if (!addon) {
        throw new AddonRegistryError(
          `Missing addon dependency '${name}'${path.length ? ` (required by ${path[path.length - 1]})` : ""}.`,
        );
      }
      visiting.add(name);
      for (const dep of addon.manifest.depends) visit(dep, [...path, name]);
      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.addons.keys()) visit(name, []);
    return order;
  }

  /** Validate the whole registry without registering: order + collisions. */
  validate(): string[] {
    const order = this.resolveOrder();
    const state = emptyState();
    for (const name of order) {
      const { manifest } = this.addons.get(name)!;
      this.claim(state, name, manifest);
    }
    return order;
  }

  private claim(state: RegistryState, addonName: string, manifest: AddonManifest): void {
    const groups: Array<[keyof RegistryState, string[]]> = [
      ["routes", manifest.provides.routes],
      ["models", manifest.provides.models],
      ["migrations", manifest.provides.migrations],
      ["seeds", manifest.provides.seeds],
      ["permissions", manifest.provides.permissions],
    ];
    for (const [group, items] of groups) {
      for (const item of items) {
        if (state[group].has(item)) {
          throw new AddonRegistryError(
            `Addon '${addonName}' provides ${group} '${item}' which is already claimed by another addon.`,
          );
        }
        state[group].add(item);
      }
    }
  }

  /** Load addons in dependency order, invoking each register callback. */
  async load(): Promise<RegistryState> {
    const order = this.resolveOrder();
    const state = emptyState();
    const loaded: string[] = [];

    for (const name of order) {
      const addon = this.addons.get(name)!;
      this.claim(state, name, addon.manifest);
      await addon.register({ loaded: [...loaded], state });
      loaded.push(name);
    }

    return state;
  }
}
