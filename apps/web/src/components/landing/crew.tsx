"use client";

import Image from "next/image";
import Link from "next/link";
import { crewStats, witnesses } from "@/lib/data";
import { artSrc } from "@/lib/art";
import { ArrowRight } from "@moonwitness/ui/icons";
import { CrewConstellation, Halftone } from "@moonwitness/ui";

export function Crew() {
  return (
    <section
      id="crew"
      className="relative scroll-mt-20 border-y-2 border-[var(--line)] bg-[var(--panel)] py-20"
    >
      <Halftone tone="pink" className="pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="sticker sticker-blue inline-block -rotate-1 px-4 py-1.5 font-brush text-sm">
              CREW CONSTELLATION
            </span>
            <h2 className="font-brush mt-4 text-3xl text-white sm:text-4xl">
              A GLOBAL MAP OF WITNESSES.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Different places. Different perspectives. Same moon. Click a witness to hear their
              signal.
            </p>
          </div>
          <div className="relative hidden h-28 w-56 overflow-hidden rounded-md border-2 border-[var(--line)] md:block">
            <Image src={artSrc("crew-rooftop")} alt="" fill className="object-cover" sizes="224px" />
          </div>
        </div>
        <CrewConstellation
          witnesses={witnesses}
          stats={crewStats}
          cta={
            <Link href="/shadow" className="btn-zine btn-blue px-5 py-3 text-base">
              EXPLORE THE CREW <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    </section>
  );
}
