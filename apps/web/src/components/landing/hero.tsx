"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bolt, Crown, Smiley, Splatter, Star4 } from "@moonwitness/ui/icons";
import { Grain, Tape } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { AtmosphereField } from "@/components/atmosphere";

export function Hero() {
  return (
    <section id="home" className="relative flex min-h-[92vh] items-center overflow-hidden pt-16">
      <Grain />
      <Image
        src={artSrc("hero-witness")}
        alt="A witness in a magenta jacket looking up at the moon over the neon city"
        fill
        priority
        className="object-cover object-[30%_center]"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,11,16,0.85)] via-[rgba(11,11,16,0.35)] to-transparent" />
      <AtmosphereField
        variant="hero"
        interactive
        className="inset-0 z-[1] mix-blend-screen opacity-80"
      />
      <AtmosphereField
        variant="brush"
        seed={7}
        className="inset-0 z-[2] mix-blend-screen opacity-55"
      />
      <Splatter className="absolute -left-10 top-24 h-56 w-56 text-[var(--pink)] opacity-70" />
      <Star4 className="absolute right-[12%] top-28 h-8 w-8 text-[var(--pink)]" />
      <Bolt className="absolute bottom-24 left-[42%] hidden h-12 w-9 text-[var(--yellow)] md:block" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-3xl rise-in">
          <div className="relative inline-block">
            <Splatter className="absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)] text-[var(--pink)] opacity-80" />
            <h1 className="font-brush relative text-[clamp(2.25rem,11vw,3.75rem)] leading-none text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)] sm:text-8xl">
              MOON<span className="text-[var(--pink)]">WITNESS</span>
            </h1>
            <Crown className="absolute -top-7 right-2 h-8 w-12 -rotate-12 text-[var(--yellow)]" />
          </div>
          <div className="sticker sticker-yellow mt-6 inline-block -rotate-1 px-5 py-2.5 font-brush text-sm tracking-wide sm:text-lg">
            PEOPLE. PLACES. STORIES. ANOTHER SIDE OF REALITY.
          </div>
          <div className="sticker mt-6 max-w-md rotate-[-1.5deg] p-5">
            <Tape className="-top-3 left-8 -rotate-6" />
            <p className="font-hand text-xl font-bold leading-snug sm:text-2xl">
              A global story network for curious humans. Different people. Same moon. Bigger
              perspectives.
            </p>
          </div>
          <div className="mt-8">
            <Link href="/dock" className="btn-zine px-8 py-4 text-xl">
              EXPLORE THE SIGNALS <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute right-6 top-32 hidden rotate-3 lg:block">
        <div
          className="sticker float-y px-4 py-3 font-hand text-xl font-bold"
          style={{ "--rot": "3deg" } as React.CSSProperties}
        >
          LOOK FURTHER
          <br />
          THAN WE DO.
        </div>
      </div>
      <div className="absolute bottom-28 right-[8%] hidden -rotate-2 lg:block">
        <div
          className="sticker sticker-black float-y border border-[var(--line)] px-4 py-3 font-hand text-xl"
          style={{ "--rot": "-2deg", animationDelay: "1.2s" } as React.CSSProperties}
        >
          SAME MOON.
          <br />
          DIFFERENT WITNESSES.
        </div>
      </div>
      <Smiley className="absolute bottom-16 left-[6%] hidden h-12 w-12 -rotate-12 text-[var(--yellow)] md:block" />
    </section>
  );
}
