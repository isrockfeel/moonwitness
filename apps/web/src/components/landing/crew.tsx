"use client";

import Image from "next/image";
import Link from "next/link";
import { witnesses } from "@/lib/data";
import { artSrc } from "@/lib/art";
import { ArrowRight, SkullCrossbonesFunky } from "@moonwitness/ui/icons";
import { CrewConstellation, Halftone, Staple, TactileTape } from "@moonwitness/ui";

export function Crew() {
  return (
    <section id="crew" className="relative scroll-mt-20 border-y-2 border-black bg-[#0d0d14] py-24">
      <Halftone tone="pink" className="pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b-2 border-dashed border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SkullCrossbonesFunky className="h-5 w-5 text-[var(--yellow)]" />
              <span className="font-mono text-xs font-black tracking-widest text-[var(--pink)]">
                SUBVERSIVE NETWORK // GLOBAL FREQUENCIES
              </span>
            </div>
            <h2 className="cmyk-slip font-brush text-4xl text-white sm:text-5xl">
              A GLOBAL MAP OF <span className="text-[var(--blue)]">WITNESSES.</span>
            </h2>
            <p className="mt-2 max-w-xl font-mono text-xs text-zinc-300">
              Same moon, different story coordinates. Select a fictional demo profile on the map or
              in the list to read their story quote.
            </p>
          </div>
          <div className="relative hidden h-32 w-64 overflow-hidden border-2 border-black bg-black shadow-[6px_6px_0_rgba(0,0,0,0.8)] md:block rotate-1">
            <Image
              src={artSrc("crew-wall")}
              alt="Fictional demo crew collage"
              fill
              className="object-cover contrast-125"
              sizes="256px"
            />
            <TactileTape
              variant="yellow"
              label="DEMO COLLAGE"
              width={110}
              className="-top-2 right-2 rotate-6 text-[9px]"
            />
            <Staple className="bottom-2 left-2 -rotate-45" />
          </div>
        </div>
        <CrewConstellation
          witnesses={witnesses}
          stats={[]}
          demo
          stickerText="DEMO CHARACTERS. SAME STORY SKY."
          cta={
            <Link
              href="/shadow"
              className="btn-zine btn-blue px-6 py-3.5 text-base shadow-[4px_4px_0_#000]"
            >
              EXPLORE THE CREW <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    </section>
  );
}
