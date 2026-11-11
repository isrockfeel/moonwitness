"use client";

import type { Witness } from "@moonwitness/types";
import { useState, type ReactNode } from "react";
import { Crown } from "../icons";
import { Tape } from "../primitives/tape";
import { WitnessAvatar } from "../primitives/witness-avatar";
import { CountUp } from "./count-up";

export interface CrewConstellationProps {
  witnesses: Witness[];
  stats: { label: string; target: number }[];
  /** Slot R2: app yang menyuplai tombol tautan, jadi semantics link tetap milik app. */
  cta?: ReactNode;
  /** Slot latar dekoratif (mis. atmosfer p5 dari app); ui tetap bebas p5. */
  backdrop?: ReactNode;
}

/** Peta saksi: pilihan titik tetap state internal, datanya milik app. */
export function CrewConstellation({ witnesses, stats, cta, backdrop }: CrewConstellationProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = witnesses.find((w) => w.id === selectedId) ?? witnesses[0];
  if (!selected) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="zine-card-rough relative overflow-hidden p-4">
        <div className="halftone relative h-72 overflow-hidden rounded-md bg-[#0d0d16] sm:h-80">
          {backdrop}
          <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full" aria-hidden>
            {witnesses.map((a, i) =>
              witnesses
                .slice(i + 1)
                .map((b) => (
                  <line
                    key={`${a.id}-${b.id}`}
                    x1={a.x}
                    y1={a.y * 0.7}
                    x2={b.x}
                    y2={b.y * 0.7}
                    stroke={i % 2 ? "#ff2d78" : "#2ea8ff"}
                    strokeWidth="0.18"
                    strokeDasharray="1.2 1.6"
                    opacity="0.45"
                  />
                )),
            )}
            {witnesses.map((w) => (
              <circle
                key={w.id}
                cx={w.x}
                cy={w.y * 0.7}
                r={selected.id === w.id ? 2.2 : 1.3}
                fill={selected.id === w.id ? "#ffd21f" : "#ff2d78"}
                className="pulse-dot"
                style={{ animationDelay: `${w.x * 20}ms` }}
              />
            ))}
          </svg>
          {witnesses.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelectedId(w.id)}
              aria-label={`Witness ${w.name}, ${w.place}`}
              aria-pressed={selected.id === w.id}
              className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 transition-all after:absolute after:-inset-1.5 after:content-[""] ${
                selected.id === w.id
                  ? "z-10 scale-125 border-[var(--yellow)] shadow-[0_0_14px_rgba(255,210,31,0.55)]"
                  : "border-white/60 hover:scale-110 hover:border-[var(--pink)]"
              }`}
              style={{ left: `${w.x}%`, top: `${w.y}%` }}
            >
              <WitnessAvatar seed={w.name} size={36} alt="" options={{ radius: 50 }} />
            </button>
          ))}
          <span className="sticker sticker-pink absolute bottom-3 left-3 -rotate-2 px-3 py-1 font-hand text-base font-bold">
            REAL PEOPLE. REAL PLACES. SAME SKY.
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border border-[var(--line)] bg-[var(--panel-2)] px-2 py-3"
            >
              <div className="font-brush text-xl text-[var(--yellow)] sm:text-2xl">
                <CountUp target={s.target} />
              </div>
              <div className="mt-1 text-[10px] tracking-widest text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="zine-card relative flex-1 p-5" aria-live="polite">
          <Tape className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />
          <div className="flex items-center gap-3">
            <WitnessAvatar
              seed={selected.name}
              size={48}
              alt={`Avatar ${selected.name}`}
              className="rounded-full border-2 border-[var(--pink)]"
              options={{ radius: 50 }}
            />
            <div>
              <div className="font-brush text-lg text-white">{selected.name}</div>
              <div className="text-xs text-zinc-500">{selected.place}</div>
            </div>
            <Crown className="ml-auto h-4 w-6 text-[var(--yellow)]" />
          </div>
          <p className="mt-4 font-hand text-xl leading-snug text-zinc-200">“{selected.quote}”</p>
          <div className="mt-4 text-xs text-zinc-500">
            <span className="text-[var(--blue)]">{selected.signals}</span> signals contributed
          </div>
        </div>
        {cta}
      </div>
    </div>
  );
}
