"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CassetteTape } from "@moonwitness/ui/icons";
import { DistressedSticker, Grain, Staple, TactileTape } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";

export function Transmission() {
  return (
    <section
      id="transmission"
      className="relative scroll-mt-20 overflow-hidden border-y-2 border-[var(--line)] bg-[var(--ink)] py-16 md:py-20"
    >
      <Grain />
      <div
        data-transmission-strip
        aria-hidden="true"
        className="transmission-strip absolute inset-x-0 top-0 h-2 origin-left bg-[var(--pink)]"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <header className="mb-8 flex flex-wrap items-end gap-x-6 gap-y-3 border-b-2 border-[var(--line)] pb-4">
          <span
            data-transmission-id
            className="ink-tick font-brush text-5xl leading-none text-[var(--yellow)] sm:text-6xl"
          >
            001
          </span>
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-zinc-300">
              <CassetteTape aria-hidden className="h-3 w-4" />
              TRANSMISSION / STORY FILE
            </p>
            <h2 className="mt-1 font-brush text-3xl leading-tight text-white sm:text-4xl">
              THE VOICES IN THE <span className="text-[var(--pink)]">FOG</span>
            </h2>
          </div>
          <DistressedSticker variant="hazard" text="FICTION" className="ml-auto" />
        </header>

        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-start">
          <figure className="relative border-2 border-[var(--line)] bg-[var(--panel)]">
            <Staple className="-top-1 left-6 -rotate-12" />
            <TactileTape
              variant="yellow"
              label="STORY ART"
              width={100}
              className="-top-2 right-4 rotate-3 text-[9px]"
            />
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={artSrc("fog-voices")}
                alt="Illustration: fog rolling through a city street at night while a figure watches from the shadows"
                fill
                className="object-cover grayscale contrast-125"
                sizes="(max-width: 768px) 100vw, 58vw"
              />
              <div className="absolute inset-0 bg-[var(--pink)] opacity-25 mix-blend-color" />
            </div>
            <figcaption className="border-t-2 border-[var(--line)] px-4 py-2 font-mono text-[11px] text-zinc-400">
              Existing MoonWitness story art, reused for this fiction file.
            </figcaption>
          </figure>

          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs tracking-widest text-[var(--blue)]">
              FICTIONAL NARRATIVE · DEMO STORY
            </p>
            <p className="font-mono text-sm leading-relaxed text-zinc-300">
              In this story, three characters in the old textile district each hear the same
              frequency rise, fall, and rise again, like a signal being answered. None of them can
              say where it comes from.
            </p>
            <blockquote className="border-l-2 border-[var(--pink)] pl-4 font-hand text-lg italic text-zinc-100">
              &ldquo;It wasn&rsquo;t coming from any tower I recognised. It was in the walls.&rdquo;
              <footer className="mt-1 font-mono text-[11px] not-italic text-zinc-400">
                Character dialogue, not a real account
              </footer>
            </blockquote>
            <Link
              href="/dock"
              className="group mt-2 flex min-h-11 items-center justify-between gap-4 border-2 border-[var(--pink)] bg-[var(--panel)] px-5 py-3 transition-colors hover:bg-[var(--pink)] hover:text-[var(--ink)]"
            >
              <span className="font-brush text-lg font-black">READ THE FULL TRANSMISSION</span>
              <ArrowRight
                aria-hidden
                className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
