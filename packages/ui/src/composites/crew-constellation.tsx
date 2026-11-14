"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Crown } from "../icons";
import { Tape } from "../primitives/tape";
import { WitnessAvatar } from "../primitives/witness-avatar";
import { CountUp } from "./count-up";

export interface WitnessItem {
  id: string;
  name: string;
  place: string;
  x: number;
  y: number;
  quote: string;
  signals: number;
}

export interface CrewStat {
  label: string;
  target: number;
}

export interface CrewConstellationProps<
  W extends WitnessItem = WitnessItem,
  S extends CrewStat = CrewStat,
> {
  witnesses: W[];
  stats: S[];
  /** Slot R2: app yang menyuplai tombol tautan, jadi semantics link tetap milik app. */
  cta?: ReactNode;
  /** Slot latar dekoratif (mis. atmosfer p5 dari app); ui tetap bebas p5. */
  backdrop?: ReactNode;
  /** Teks stiker kustom (default: REAL PEOPLE. REAL PLACES. SAME SKY.) */
  stickerText?: string;
  demo?: boolean;
}

/** Peta saksi: pilihan titik tetap state internal, datanya milik app. */
export function CrewConstellation<W extends WitnessItem, S extends CrewStat>({
  witnesses,
  stats,
  cta,
  backdrop,
  stickerText = "REAL PEOPLE. REAL PLACES. SAME SKY.",
  demo = false,
}: CrewConstellationProps<W, S>) {
  const detailId = useId();
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (media.matches) {
        map.classList.remove("constellation-draw");
        observer.disconnect();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        if (!media.matches) map.classList.add("constellation-draw");
        observer.disconnect();
      }
    });
    if (!media.matches) observer.observe(map);
    media.addEventListener("change", reduce);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", reduce);
    };
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = witnesses.find((w) => w.id === selectedId) ?? witnesses[0];
  if (!selected) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="zine-card-rough relative overflow-hidden p-4">
        <div ref={mapRef} className="halftone relative aspect-[10/7] rounded-md bg-[#0d0d16]">
          {backdrop}
          <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full" aria-hidden>
            {witnesses.slice(0, 6).map((a, i) => {
              const b = witnesses[i + 1];
              if (!b) return null;
              return (
                <line
                  key={`${a.id}-${b.id}`}
                  x1={a.x}
                  y1={a.y * 0.7}
                  x2={b.x}
                  y2={b.y * 0.7}
                  stroke="#2ea8ff"
                  strokeWidth="0.25"
                  opacity="0.65"
                  pathLength={1}
                  className="constellation-connection"
                />
              );
            })}
            {witnesses.map((w) => (
              <circle
                key={w.id}
                cx={w.x}
                cy={w.y * 0.7}
                r={selected.id === w.id ? 2.2 : 1.3}
                fill={selected.id === w.id ? "#ffd21f" : "#ff2d78"}
              />
            ))}
          </svg>
          {witnesses.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelectedId(w.id)}
              type="button"
              aria-label={`${demo ? "Demo witness" : "Witness"} ${w.name}, ${w.place}`}
              aria-pressed={selected.id === w.id}
              aria-controls={detailId}
              className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-[#0d0d16] transition-colors active:border-white ${
                selected.id === w.id
                  ? "z-10 border-[var(--yellow)]"
                  : "border-white/60 hover:border-[var(--pink)]"
              }`}
              style={{ left: `${w.x}%`, top: `${w.y}%` }}
            >
              {selected.id === w.id && (
                <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[var(--yellow)] px-1 text-[9px] font-bold leading-tight text-black">
                  Selected
                </span>
              )}
              <WitnessAvatar seed={w.name} size={36} alt="" options={{ radius: 50 }} />
            </button>
          ))}
        </div>
        <p className="sticker sticker-yellow mt-4 px-3 py-1 font-hand text-base font-bold">
          {stickerText}
        </p>
        {demo && (
          <p className="mt-3 text-xs text-zinc-300">
            Fictional demo profiles, illustrated avatars and story quotes. Not verified witnesses or
            activity.
          </p>
        )}
        <ul
          aria-label={demo ? "Select a demo witness" : "Select a witness"}
          className="mt-4 flex flex-wrap gap-2"
        >
          {witnesses.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setSelectedId(w.id)}
                aria-pressed={selected.id === w.id}
                aria-controls={detailId}
                className={`min-h-11 border-2 px-3 py-2 text-sm text-zinc-100 hover:underline active:bg-black ${selected.id === w.id ? "border-[var(--yellow)]" : "border-zinc-400"}`}
              >
                {w.name}
                {selected.id === w.id && (
                  <span className="ml-2 bg-[var(--yellow)] px-1 text-xs font-bold text-black">
                    Selected
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
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
        <div
          id={detailId}
          className="zine-card relative flex-1 p-5"
          aria-live="polite"
          aria-atomic="true"
        >
          <Tape className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />
          <div className="flex items-center gap-3">
            <WitnessAvatar
              seed={selected.name}
              size={48}
              alt={`${demo ? "Demo illustration" : "Avatar"} ${selected.name}`}
              className="rounded-full border-2 border-[var(--pink)]"
              options={{ radius: 50 }}
            />
            <div>
              <div className="font-brush text-lg text-white">{selected.name}</div>
              <div className="text-xs text-zinc-300">{selected.place}</div>
            </div>
            <Crown className="ml-auto h-4 w-6 text-[var(--yellow)]" />
          </div>
          <p className="mt-4 font-hand text-xl leading-snug text-zinc-200">“{selected.quote}”</p>
          {demo ? (
            <p className="mt-4 text-xs text-zinc-300">Fictional story quote, not a testimonial.</p>
          ) : (
            <div className="mt-4 text-xs text-zinc-500">
              <span className="text-[var(--blue)]">{selected.signals}</span> signals contributed
            </div>
          )}
        </div>
        {cta}
      </div>
    </div>
  );
}
