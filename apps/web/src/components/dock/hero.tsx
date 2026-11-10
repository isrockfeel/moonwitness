"use client";

import Image from "next/image";
import { timelineEvents } from "@/lib/data";
import { Grain } from "@moonwitness/ui";
import { Splatter } from "@moonwitness/ui/icons";

export function DockHero({ visibleCount }: { visibleCount: number }) {
  return (
    <div className="relative overflow-hidden border-b-2 border-[var(--line)]">
      <Grain />
      <Image
        src="/art/crew-rooftop.png"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="(max-width: 1024px) 100vw, 80vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,11,16,0.94)] via-[rgba(11,11,16,0.6)] to-[rgba(11,11,16,0.3)]" />
      <Splatter className="absolute -left-6 top-4 h-32 w-32 text-[var(--pink)] opacity-60" />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 px-4 py-10 sm:px-8">
        <div>
          <h1 className="font-brush text-4xl leading-none text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] sm:text-6xl">
            DOCK — <span className="text-[var(--pink)]">TIMELINE</span> CHRONICLE
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">
            A public chronology of projects, stories, signals, and moments across the Empire.
            Different people. Same sky. Many stories.
          </p>
        </div>
        <div className="text-right">
          <div className="font-brush text-5xl text-[var(--yellow)]">
            {visibleCount}
            <span className="text-2xl text-zinc-400">/{timelineEvents.length}</span>
          </div>
          <div className="text-[10px] tracking-widest text-zinc-400">EVENTS VISIBLE</div>
        </div>
      </div>
    </div>
  );
}
