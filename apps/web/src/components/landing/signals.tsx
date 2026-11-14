"use client";

import Image from "next/image";
import Link from "next/link";
import { artSrc } from "@/lib/art";
import { ArrowRight, Crown, SafetyPin, SprayCan } from "@moonwitness/ui/icons";
import { DistressedSticker, Staple, TactileTape } from "@moonwitness/ui";

export function Signals() {
  return (
    <section id="signals" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <SprayCan className="h-5 w-5 text-[var(--pink)]" />
            <span className="font-mono text-xs font-black tracking-widest text-[var(--yellow)]">
              FREQUENCY LOGS // PIRATE FEED
            </span>
          </div>
          <h2 className="cmyk-slip font-brush text-4xl text-white sm:text-5xl">
            THE <span className="brush-underline text-[var(--pink)]">SIGNALS</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <DistressedSticker variant="foil" text="FICTIONAL STORIES" className="rotate-2" />
          <Crown className="h-8 w-11 text-[var(--yellow)] rotate-6" />
        </div>
      </div>

      {/* Street Flyer Paste-Up Grid: Asymmetric offsets with tactiles */}
      <div className="grid gap-8 md:grid-cols-3">
        <article className="zine-card-rough photocopy-grit group relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[-0.5deg] md:-rotate-1">
          <Staple className="top-2 left-3 -rotate-12" />
          <TactileTape
            variant="yellow"
            label="STORYWORLD"
            width={90}
            className="-top-1 -right-4 rotate-12 text-[9px]"
          />
          <div className="relative h-48 overflow-hidden bg-black/60">
            <Image
              src={artSrc("signal-tunnel")}
              alt="Illustrated tunnel scene from a fictional Moonwitness story"
              fill
              className="duo-img object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <span className="sticker sticker-pink absolute left-3 top-3 px-3 py-1 font-brush text-xs rotate-[-2deg] shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
              FICTIONAL SIGNAL
            </span>
          </div>
          <div className="flex flex-1 flex-col p-5 bg-gradient-to-b from-[var(--panel)] to-[#0e0e15]">
            <h3 className="cmyk-slip font-brush text-2xl leading-tight text-white tracking-wide">
              A SIGNAL FROM BELOW
            </h3>
            <p className="mt-2 flex-1 font-mono text-xs leading-relaxed text-zinc-300">
              A story from the Moonwitness storyworld. Strange sounds. A deeper current. What are we
              really hearing?
            </p>
            <Link
              href="/dock"
              className="btn-zine btn-blue mt-4 min-h-11 px-5 py-2.5 text-sm shadow-[3px_3px_0_#000]"
            >
              READ SIGNAL STORY <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>

        <article className="zine-card-rough photocopy-grit group relative flex flex-col overflow-hidden transition-all duration-300 md:rotate-1 hover:rotate-0 hover:-translate-y-2">
          <Staple className="top-2 left-3 -rotate-12" />
          <TactileTape
            variant="yellow"
            label="COLLAB_WALL"
            width={95}
            className="-top-1 -right-3 rotate-12 text-[9px]"
          />

          <div className="relative h-48 overflow-hidden bg-black/60">
            <Image
              src={artSrc("crew-rooftop")}
              alt="Three friends on a rooftop under the same moon"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <span className="sticker sticker-yellow absolute left-3 top-3 px-3 py-1 font-brush text-xs rotate-[-3deg] shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
              STORYTELLING
            </span>
            <SafetyPin className="absolute bottom-2 right-2 h-7 w-7 text-white/40 rotate-45" />
          </div>
          <div className="flex flex-1 flex-col p-5 bg-gradient-to-b from-[var(--panel)] to-[#0c0c14]">
            <h3 className="cmyk-slip font-brush text-2xl leading-tight text-white">
              STORIES. BIGGER HORIZONS.
            </h3>
            <p className="mt-2 flex-1 font-mono text-xs leading-relaxed text-zinc-300">
              Fictional story fragments from the Moonwitness storyworld.
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
              <Link
                href="/dock"
                className="btn-zine btn-blue min-h-11 px-5 py-2.5 text-sm shadow-[3px_3px_0_#000]"
              >
                EXPLORE STORIES <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="font-mono text-[10px] text-zinc-500">TAG: #ROOFTOP</span>
            </div>
          </div>
        </article>

        <article className="zine-card-rough photocopy-grit group relative flex flex-col overflow-hidden transition-all duration-300 md:-rotate-1 hover:rotate-0 hover:-translate-y-2">
          <Staple className="top-2 right-3 rotate-45" />
          <TactileTape
            variant="black"
            label="SEALED"
            width={80}
            className="-top-1 -left-3 -rotate-12 text-[9px]"
          />

          <div className="relative h-48 overflow-hidden bg-black/60">
            <Image
              src={artSrc("city-shadow")}
              alt="A hooded witness overlooking the city at night"
              fill
              className="object-cover object-[70%_center] transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <span className="sticker sticker-pink absolute left-3 top-3 px-3 py-1 font-brush text-xs rotate-2 shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
              THE SHADOW
            </span>
          </div>
          <div className="flex flex-1 flex-col p-5 bg-gradient-to-b from-[var(--panel)] to-[#0c0c14]">
            <h3 className="cmyk-slip font-brush text-2xl leading-tight text-white">
              NOT EVERYTHING IS VISIBLE.
            </h3>
            <p className="mt-2 flex-1 font-mono text-xs leading-relaxed text-zinc-300">
              Fictional signals, invented connections, and scenes from the Moonwitness storyworld.
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
              <Link
                href="/dock"
                className="btn-zine btn-yellow min-h-11 px-5 py-2.5 text-sm shadow-[3px_3px_0_#000]"
              >
                ACCESS ARCHIVE <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="font-mono text-[10px] text-[var(--red)] font-bold">
                STORYWORLD ARCHIVE
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
