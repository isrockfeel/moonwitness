"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { artSrc } from "@/lib/art";
import { ArrowRight, CassetteTape, Smiley } from "@moonwitness/ui/icons";
import { DistressedSticker, Staple, kindColors } from "@moonwitness/ui";
import { useTimelineEvents } from "@/lib/api/timeline";

function ArchiveStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const { data, isPending, isError, isFetching, refetch } = useTimelineEvents({ limit: 8 });
  const items = data?.data ?? [];
  const [edges, setEdges] = useState({ left: true, right: true });
  useEffect(() => {
    const strip = ref.current;
    if (!strip) return;
    const measure = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      setEdges({ left: strip.scrollLeft <= 1, right: max <= 1 || strip.scrollLeft >= max - 1 });
    };
    measure();
    strip.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    for (const child of strip.children) observer.observe(child);
    window.addEventListener("resize", measure);
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      if (motionPreference.matches) {
        strip.scrollTo({ left: strip.scrollLeft, behavior: "instant" });
      }
    };
    motionPreference.addEventListener("change", handleMotionChange);
    return () => {
      strip.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      motionPreference.removeEventListener("change", handleMotionChange);
      observer.disconnect();
    };
  }, [data, isPending, isError]);
  const scroll = (dir: number) => {
    const strip = ref.current;
    if (!strip) return;
    strip.scrollBy({
      left: dir * strip.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  const unavailable = isPending || isError || !items.length;

  return (
    <div className="relative">
      {isPending ? (
        <p role="status" className="min-h-44 py-8 text-sm text-zinc-300">
          Loading archive…
        </p>
      ) : isError ? (
        <div className="min-h-44 py-8">
          <p role="alert" className="text-sm text-zinc-300">
            Archive unavailable.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="archive-control mt-4 min-h-11 border-2 border-zinc-400 px-4 py-2 text-sm text-zinc-100"
          >
            {isFetching ? "Retrying archive…" : "Retry archive"}
          </button>
        </div>
      ) : !items.length ? (
        <p role="status" className="min-h-44 py-8 text-sm text-zinc-300">
          No timeline events available.
        </p>
      ) : null}
      <div
        ref={ref}
        className="flex snap-x snap-proximity gap-5 overflow-x-auto pb-6 pt-2"
        aria-label="Archive event previews"
        style={{ scrollbarWidth: "thin" }}
      >
        {!unavailable &&
          items.map((ev, index) => (
            <Link
              key={ev.id}
              href={`/dock?event=${encodeURIComponent(ev.id)}`}
              className="archive-preview zine-card photocopy-grit group relative w-64 shrink-0 snap-start overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:rotate-1"
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
        <Link
          href="/dock"
          className="archive-browse btn-zine btn-blue min-h-11 px-4 py-3 text-sm shadow-[3px_3px_0_#000]"
        >
          BROWSE FULL ARCHIVE <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={unavailable || edges.left}
            onClick={() => scroll(-1)}
            aria-label="Scroll archive left"
            className="archive-control zine-card flex min-h-11 min-w-11 items-center justify-center font-mono font-bold text-zinc-300"
          >
            ←
          </button>
          <button
            type="button"
            disabled={unavailable || edges.right}
            onClick={() => scroll(1)}
            aria-label="Scroll archive right"
            className="archive-control zine-card flex min-h-11 min-w-11 items-center justify-center font-mono font-bold text-zinc-300"
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
