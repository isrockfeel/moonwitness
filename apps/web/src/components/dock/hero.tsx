"use client";

import Image from "next/image";
import { artSrc } from "@/lib/art";
import { CinematicFrame, DistressedSticker, Grain, MangaSpeedLines, Staple, TactileTape } from "@moonwitness/ui";
import { Splatter } from "@moonwitness/ui/icons";

export function DockHero({ visibleCount, total }: { visibleCount: number; total: number }) {
  return (
    <div className="relative overflow-hidden border-b-2 border-black bg-black">
      <Grain />
      <CinematicFrame className="absolute inset-0 z-0" reel="DOCK-CHRONICLE" timecode="CH-09:44:00">
        <Image
          src={artSrc("crew-rooftop")}
          alt=""
          fill
          priority
          className="object-cover object-center filter contrast-125"
          sizes="(max-width: 1024px) 100vw, 80vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(7,7,12,0.96)] via-[rgba(7,7,12,0.65)] to-[rgba(7,7,12,0.25)]" />
        <MangaSpeedLines density={48} center={[85, 40]} opacity={0.22} className="text-white" />
      </CinematicFrame>

      <Splatter className="absolute -left-6 top-4 h-40 w-40 text-[var(--pink)] opacity-70" />
      <TactileTape variant="yellow" label="INVESTIGATION LOGS" width={170} className="-top-1 right-12 rotate-2 text-[10px]" />
      <Staple className="top-3 left-4 -rotate-45" />

      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 px-4 py-12 sm:px-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <DistressedSticker variant="hazard" text="PUBLIC DOSSIER ARCHIVE" />
            <DistressedSticker variant="barcode" code="DOC-LEAK-2026" className="rotate-2" />
          </div>
          <h1 className="cmyk-slip font-brush text-4xl leading-none text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.9)] sm:text-6xl">
            DOCK — <span className="text-[var(--pink)]">TIMELINE</span> CHRONICLE
          </h1>
          <p className="mt-4 max-w-xl font-mono text-xs leading-relaxed text-zinc-300">
            A public chronology of intercepted projects, clandestine sightings, and pirate signals.
            Documented by witnesses worldwide under the same moon.
          </p>
        </div>
        <div className="text-right">
          <div className="cmyk-slip font-brush text-6xl text-[var(--yellow)]">
            {visibleCount}
            <span className="text-2xl text-zinc-400 font-mono">/{total}</span>
          </div>
          <div className="font-mono text-[10px] tracking-widest text-zinc-400 font-bold uppercase">
            EVIDENCE DOSSIERS VISIBLE
          </div>
        </div>
      </div>
    </div>
  );
}
