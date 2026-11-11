"use client";

import { useMemo, useRef } from "react";
import type { MapCity } from "@moonwitness/types";
import { useP5, useReducedMotion } from "./use-p5";
import { makeFactory, type AtmosphereVariant } from "./sketches";

export interface AtmosphereFieldProps {
  variant: AtmosphereVariant;
  className?: string;
  seed?: number;
  interactive?: boolean;
  density?: number;
  cities?: MapCity[];
}

/**
 * Lapisan atmosfer p5 client-only. Reduced-motion → canvas tidak dibuat (fallback
 * halftone/grain CSS di block tetap hidup). Container selalu dirender agar SSR dan
 * hydration cocok; p5 di luar packages/ui; palet dari CSS vars theme.
 */
export function AtmosphereField({
  variant,
  className,
  seed = 1,
  interactive = false,
  density = 1,
  cities,
}: AtmosphereFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Disable p5 on mobile to reduce main thread blocking
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  }, []);
  const factory = useMemo(
    () => makeFactory(variant, { seed, interactive, density, cities }),
    [variant, seed, interactive, density, cities],
  );
  useP5(ref, factory, {
    enabled: !reduced && !isMobile,
    continuous: variant !== "brush",
    interactive,
    seed,
  });

  return (
    <div
      ref={ref}
      aria-hidden
      className={["pointer-events-none absolute overflow-hidden [&>canvas]:block", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
