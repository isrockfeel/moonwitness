"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MapCity } from "@moonwitness/types";
import { useMotionPaused } from "@/lib/motion/motion-pause";
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
  const paused = useMotionPaused();
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
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
    paused,
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
