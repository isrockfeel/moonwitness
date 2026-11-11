"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { artSrc } from "@/lib/art";
import { timelineEvents } from "@/lib/data";
import { ArrowRight, Smiley } from "@moonwitness/ui/icons";
import { kindColors } from "@moonwitness/ui";

function ArchiveStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  const items = timelineEvents.slice(0, 8);

  return (
    <div className="relative">
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
        {items.map((ev) => (
          <Link
            key={ev.id}
            href={`/dock?event=${ev.id}`}
            className="zine-card group w-60 shrink-0 overflow-hidden transition-transform hover:-translate-y-1"
          >
            <div className="relative h-28 overflow-hidden">
              <Image
                src={artSrc(ev.image)}
                alt=""
                fill
                className="object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                style={{ objectPosition: ev.imagePosition ?? "center" }}
                sizes="240px"
              />
              <span
                className="absolute left-2 top-2 px-2 py-0.5 font-brush text-[10px]"
                style={{
                  background: kindColors[ev.kind],
                  color: ev.kind === "SIGNAL" ? "#111" : "#fff",
                }}
              >
                {ev.kind}
              </span>
            </div>
            <div className="p-3">
              <div className="text-[10px] text-zinc-500">{ev.date}</div>
              <div className="mt-1 font-brush text-sm leading-snug text-white group-hover:text-[var(--pink)]">
                {ev.title.toUpperCase()}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Link href="/dock" className="btn-zine btn-blue px-4 py-2 text-sm max-lg:min-h-11">
          BROWSE ARCHIVE <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll archive left"
            className="zine-card flex min-h-11 min-w-11 items-center justify-center px-3 py-1.5 text-zinc-300 hover:text-[var(--pink)]"
          >
            ←
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll archive right"
            className="zine-card flex min-h-11 min-w-11 items-center justify-center px-3 py-1.5 text-zinc-300 hover:text-[var(--pink)]"
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
    <section id="archive" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="sticker sticker-yellow inline-block rotate-1 px-4 py-1.5 font-brush text-sm">
            ARCHIVE
          </span>
          <h2 className="font-brush mt-4 text-3xl text-white sm:text-4xl">
            A TIMELINE OF SIGNALS.
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Past transmissions, ongoing mysteries, and the stories that connect them.
          </p>
        </div>
        <Smiley className="hidden h-10 w-10 rotate-12 text-[var(--pink)] sm:block" />
      </div>
      <ArchiveStrip />
    </section>
  );
}
