"use client";

import type { ArtKey, TimelineEvent } from "@moonwitness/types";
import { useEffect, useState } from "react";
import { PauseIcon, PlayIcon } from "../icons";
import { ZineImage } from "../primitives/zine-image";

export interface TransmissionCardProps {
  event: TimelineEvent;
  /** Kartu promosi bisa memakai artwork lain daripada image event-nya. */
  art?: ArtKey;
  durationSeconds?: number;
  /** Teks stiker; angka "001" adalah copy tampilan, bukan turunan `event.id`. */
  label?: string;
  /** Kartu promosi bisa memakai copy sendiri yang tidak dimiliki event mana pun. */
  title?: string;
  excerpt?: string;
}

/** Kartu transmisi berdurasi: timer dan state putar/jeda murni internal (§3.2). */
export function TransmissionCard({
  event,
  art,
  durationSeconds = 204,
  label = "TRANSMISSION 001",
  title,
  excerpt,
}: TransmissionCardProps) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setElapsed((s) => {
        if (s + 1 >= durationSeconds) {
          setPlaying(false);
          return durationSeconds;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, durationSeconds]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <article className="zine-card-rough group relative flex flex-col overflow-hidden">
      <div className="relative h-44 overflow-hidden">
        <ZineImage
          art={art ?? event.image}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="duo-img transition-transform duration-500 group-hover:scale-105"
        />
        <span className="duo-tint" />
        <span className="sticker sticker-yellow absolute left-3 top-3 px-3 py-1 font-brush text-xs">
          {label}
        </span>
        <button
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? "Pause transmission" : "Play transmission"}
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/70 bg-black/60 text-white backdrop-blur transition hover:scale-110 hover:border-[var(--pink)] hover:text-[var(--pink)]"
        >
          {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ml-0.5 h-5 w-5" />}
        </button>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-brush text-2xl leading-tight text-white">
          {(title ?? event.title).toUpperCase()}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
          {excerpt ?? event.excerpt}
        </p>
        <div className="mt-4">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]"
            role="progressbar"
            aria-valuenow={elapsed}
            aria-valuemin={0}
            aria-valuemax={durationSeconds}
            aria-label="Transmission progress"
          >
            <div
              className="h-full bg-[var(--pink)] transition-[width] duration-300"
              style={{ width: `${(elapsed / durationSeconds) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500">
            <span className={playing ? "text-[var(--pink)]" : ""}>
              {playing
                ? "● RECEIVING…"
                : elapsed >= durationSeconds
                  ? "TRANSMISSION ENDED"
                  : "STANDBY"}
            </span>
            <span>
              {fmt(elapsed)} / {fmt(durationSeconds)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
