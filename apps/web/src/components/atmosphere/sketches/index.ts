import type { MapCity } from "@moonwitness/types";
import type { SketchFactory } from "../use-p5";
import { ambientSketch } from "./ambient";
import { signalsSketch } from "./signals";
import { brushSketch } from "./brush";

export type AtmosphereVariant = "hero" | "crew" | "map" | "brush";

export interface FactoryOptions {
  seed: number;
  interactive: boolean;
  density: number;
  cities?: MapCity[];
}

export function makeFactory(variant: AtmosphereVariant, opts: FactoryOptions): SketchFactory {
  switch (variant) {
    case "hero":
      return ambientSketch({
        mode: "flow",
        density: opts.density,
        speed: 1.2,
        interactive: opts.interactive,
        glow: 80,
      });
    case "crew":
      return ambientSketch({
        mode: "dust",
        density: opts.density * 0.8,
        speed: 0.5,
        interactive: false,
        glow: 70,
      });
    case "map":
      return signalsSketch(opts.cities ?? [], { density: opts.density });
    case "brush":
      return brushSketch({ seed: opts.seed });
  }
}
