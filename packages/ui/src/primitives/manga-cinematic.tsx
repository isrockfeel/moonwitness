"use client";

import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export interface MangaSpeedLinesProps extends HTMLAttributes<HTMLDivElement> {
  density?: number;
  center?: [number, number]; // percentages [50, 50]
  opacity?: number;
}

/** Manga Radial Burst / Action Speed Lines Effect */
export function MangaSpeedLines({
  density = 48,
  center = [50, 50],
  opacity = 0.35,
  className,
  ...props
}: MangaSpeedLinesProps) {
  const [cx, cy] = center;
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden mix-blend-overlay", className)}
      style={{ opacity }}
      {...props}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="manga-center-fade" cx={`${cx}%`} cy={`${cy}%`} r="65%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="30%" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </radialGradient>
        </defs>
        <g stroke="currentColor" strokeWidth="1.5" mask="url(#manga-center-fade)">
          {[...Array(density)].map((_, i) => {
            const angle = (i / density) * 2 * Math.PI;
            const length = 1200;
            const x2 = cx + Math.cos(angle) * length;
            const y2 = cy + Math.sin(angle) * length;
            return (
              <line
                key={i}
                x1={`${cx}%`}
                y1={`${cy}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                strokeWidth={i % 3 === 0 ? "2.5" : i % 2 === 0 ? "1.8" : "1"}
                strokeOpacity={0.4 + (i % 5) * 0.12}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export interface CinematicFrameProps extends HTMLAttributes<HTMLDivElement> {
  aspectRatio?: "cinemascope" | "imax" | "standard";
  timecode?: string;
  reel?: string;
}

/** 2.39:1 Cinemascope Letterbox & Camera HUD Telemetry */
export function CinematicFrame({
  aspectRatio = "cinemascope",
  timecode = "01:24:09:18",
  reel = "CAM-01 [RAW 24FPS]",
  children,
  className,
  ...props
}: CinematicFrameProps) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      {/* Cinematic Corner Brackets */}
      <span className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-[var(--yellow)] z-20 opacity-80" />
      <span className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-[var(--yellow)] z-20 opacity-80" />
      <span className="pointer-events-none absolute left-3 bottom-3 h-5 w-5 border-l-2 border-b-2 border-[var(--yellow)] z-20 opacity-80" />
      <span className="pointer-events-none absolute right-3 bottom-3 h-5 w-5 border-r-2 border-b-2 border-[var(--yellow)] z-20 opacity-80" />

      {/* Camera Telemetry Bar */}
      <div className="pointer-events-none absolute top-3 inset-x-8 z-20 flex justify-between font-mono text-[9px] font-black text-white/70 select-none tracking-widest">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--red)] animate-ping" />
          REC // {reel}
        </span>
        <span className="text-[var(--yellow)]">{timecode}</span>
        <span>ISO 3200 · 35MM ANAMORPHIC</span>
      </div>

      {children}
    </div>
  );
}

