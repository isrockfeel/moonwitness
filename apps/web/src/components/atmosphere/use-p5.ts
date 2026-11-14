"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type p5 from "p5";
import { readPalette, type Palette } from "./palette";

export interface P5Context {
  el: HTMLElement;
  signal: AbortSignal;
  palette: Palette;
  pointer: { x: number; y: number };
  seed: number;
}

export type SketchFactory = (p: p5, ctx: P5Context) => void;

interface UseP5Options {
  enabled: boolean;
  continuous: boolean;
  interactive: boolean;
  seed: number;
  paused?: boolean;
}

/**
 * Lifecycle p5 instance-mode yang aman untuk Next App Router + StrictMode:
 * dynamic import client-only, mount sekali per effect, cleanup .remove(),
 * pause saat off-screen / tab hidden, resize mengikuti container.
 */
export function useP5(
  containerRef: RefObject<HTMLDivElement | null>,
  factory: SketchFactory,
  { enabled, continuous, interactive, seed, paused = false }: UseP5Options,
) {
  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    // Skip loading on mobile to reduce main thread blocking
    if (window.innerWidth < 768) return;

    const controller = new AbortController();
    let cancelled = false;
    let instance: p5 | null = null;
    let ro: ResizeObserver | undefined;
    let io: IntersectionObserver | undefined;
    let lastW = el.clientWidth;
    let lastH = el.clientHeight;

    const ctx: P5Context = {
      el,
      signal: controller.signal,
      palette: readPalette(el),
      pointer: { x: 0.5, y: 0.5 },
      seed,
    };

    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ctx.pointer.x = (e.clientX - r.left) / Math.max(1, r.width);
      ctx.pointer.y = (e.clientY - r.top) / Math.max(1, r.height);
    };

    const syncLoop = () => {
      if (!instance || !continuous) return;
      const visible = io ? lastIntersecting : true;
      if (document.hidden || !visible || pausedRef.current) instance.noLoop();
      else instance.loop();
    };

    let lastIntersecting = true;
    syncRef.current = syncLoop;

    void import("p5")
      .then((mod) => {
        if (cancelled) return;
        const P5 = mod.default;
        instance = new P5((p) => factory(p, ctx), el);

        ro = new ResizeObserver(() => {
          const w = el.clientWidth;
          const h = el.clientHeight;
          if (!instance || w === 0 || h === 0 || (w === lastW && h === lastH)) return;
          lastW = w;
          lastH = h;
          instance.resizeCanvas(w, h);
          if (!continuous) instance.redraw();
        });
        ro.observe(el);

        io = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            lastIntersecting = entry.isIntersecting;
            syncLoop();
          },
          { threshold: 0.01 },
        );
        io.observe(el);

        document.addEventListener("visibilitychange", syncLoop);
        if (interactive) window.addEventListener("pointermove", onPointer, { passive: true });
        syncLoop();
      })
      .catch(() => {
        /* p5 gagal dimuat: biarkan fallback CSS halftone/grain yang sudah ada. */
      });

    return () => {
      cancelled = true;
      controller.abort();
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", syncLoop);
      window.removeEventListener("pointermove", onPointer);
      syncRef.current = () => {};
      instance?.remove();
      instance = null;
    };
  }, [enabled, continuous, interactive, seed, factory, containerRef]);
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
