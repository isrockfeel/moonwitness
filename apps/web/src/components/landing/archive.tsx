"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { artSrc } from "@/lib/art";
import { ArrowRight, CassetteTape, Smiley } from "@moonwitness/ui/icons";
import { DistressedSticker, Staple, kindColors } from "@moonwitness/ui";
import { useTimelineEvents } from "@/lib/api/timeline";

function ArchiveStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  const { data } = useTimelineEvents({ limit: 8 });
  const items = data?.data ?? [];

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-5 overflow-x-auto pb-6 pt-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {items.map((ev, index) => (
          <Link
            key={ev.id}
            href={`/dock?event=${ev.id}`}
            className="zine-card photocopy-grit group relative w-64 shrink-0 overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:rotate-1"
            style={{ transform: index % 2 === 0 ? "rotate(-0.8deg)" : "rotate(0.8deg)" }}
          >
            <Staple className="top-1 left-2 -rotate-12" />
            <div className="relative h-32 overflow-hidden bg-black/60">
              <Image
                src={artSrc(ev.image)}
                alt=""
                fill
                className="object-cover grayscale contrast-125 transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0"
                style={{ objectPosition: ev.imagePosition ?? "center" }}
                sizes="260px"
              />
              <span
                className="absolute left-2 top-2 px-2.5 py-0.5 font-brush text-[11px] shadow-[2px_2px_0_rgba(0,0,0,0.8)]"
                style={{
                  background: kindColors[ev.kind],
                  color: ev.kind === "SIGNAL" ? "#111" : "#fff",
                }}
              >
                {ev.kind}
              </span>
              <span className="absolute bottom-1 right-2 font-mono text-[9px] text-white/80 bg-black/80 px-1.5 py-0.5">
                {ev.date}
              </span>
            </div>
            <div className="p-3.5 bg-gradient-to-b from-[var(--panel)] to-[#09090f]">
              <div className="font-mono text-[10px] text-[var(--yellow)] flex items-center gap-1">
                <CassetteTape className="h-3 w-4 text-[var(--yellow)]" /> EVIDENCE #{index + 101}
              </div>
              <div className="cmyk-slip mt-1 font-brush text-base leading-snug text-white group-hover:text-[var(--pink)]">
                {ev.title.toUpperCase()}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-4">
        <Link
          href="/dock"
          className="btn-zine btn-blue px-6 py-2.5 text-sm shadow-[3px_3px_0_#000]"
        >
          BROWSE FULL ARCHIVE <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll archive left"
            className="zine-card flex min-h-11 min-w-11 items-center justify-center font-mono font-bold text-zinc-300 hover:border-[var(--pink)] hover:text-[var(--pink)]"
          >
            ←
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll archive right"
            className="zine-card flex min-h-11 min-w-11 items-center justify-center font-mono font-bold text-zinc-300 hover:border-[var(--pink)] hover:text-[var(--pink)]"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export function Archive() {
  return (
    <section id="archive" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <DistressedSticker variant="hazard" text="REDACTED DOSSIER ARCHIVE" className="mb-3" />
          <h2 className="cmyk-slip font-brush text-4xl text-white sm:text-5xl">
            A TIMELINE OF <span className="text-[var(--yellow)]">SIGNALS.</span>
          </h2>
          <p className="mt-2 font-mono text-xs text-zinc-400">
            Past transmissions, underground sightings, and leaked police scanner recordings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DistressedSticker variant="barcode" code="REEL-882-ARCH" className="-rotate-3" />
          <Smiley className="hidden h-12 w-12 rotate-12 text-[var(--pink)] sm:block" />
        </div>
      </div>
      <ArchiveStrip />
    </section>
  );
}
