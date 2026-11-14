"use client";

import { useEffect, useRef } from "react";
import { AtmosphereField } from "@/components/atmosphere";

export function Entrance() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const freqRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const cancelTimers = () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
    const schedule = (callback: () => void, delay: number) => {
      if (media.matches) return;
      const timer = setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
    };
    const dismiss = () => {
      if (!media.matches) return;
      cancelTimers();
      if (containerRef.current) containerRef.current.style.display = "none";
    };
    media.addEventListener("change", dismiss);
    dismiss();

    // Phase 1: Show screen immediately
    const container = containerRef.current;
    if (!container) return;
    container.style.opacity = "1";

    // Phase 2: Frequency text flashes after brief delay
    const freqEl = freqRef.current;
    if (freqEl) {
      schedule(() => {
        freqEl.style.animation = "flash-entry 0.8s ease-out forwards";
      }, 100);
    }

    // Dismiss the entrance after ~3 seconds
    schedule(() => {
      container.style.transition = "opacity 0.8s ease";
      container.style.opacity = "0";
      schedule(() => {
        container.style.display = "none";
      }, 800);
    }, 2800);
    return () => {
      cancelTimers();
      media.removeEventListener("change", dismiss);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050508]"
      style={{ opacity: 0 }}
      aria-hidden="true"
    >
      {/* Static noise overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Frequency callout */}
      <span
        ref={freqRef}
        className="mb-6 font-mono text-xs tracking-[0.3em] text-[var(--pink)] opacity-0"
      >
        // FREQUENCY LOCKED — 1420.4 MHZ
      </span>

      {/* Main title */}
      <h1
        className="reveal-up font-brush text-[clamp(2.5rem,12vw,3.75rem)] font-black text-white sm:text-8xl md:text-9xl drop-shadow-[4px_4px_0_rgba(255,45,120,0.6)] opacity-0"
        style={{ animationDelay: "400ms" }}
      >
        MOON<span className="text-[var(--pink)]">WITNESS</span>
      </h1>

      {/* Subtitle */}
      <p className="mt-4 font-hand text-lg text-zinc-400 opacity-0 animate-fade-in">
        Another side of reality.
      </p>

      {/* Scan line effect */}
      <div
        className="scanline pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--pink)] opacity-30"
        style={{
          animation: "scanline 2.5s linear infinite",
        }}
      />

      {/* Atmospheric FX */}
      <AtmosphereField
        variant="brush"
        seed={7}
        className="inset-0 z-[1] mix-blend-screen opacity-60"
      />
    </div>
  );
}
