"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarbedWire,
  Bolt,
  CassetteTape,
  Crown,
  SafetyPin,
  SkullCrossbonesFunky,
  Smiley,
  Splatter,
  Star4,
} from "@moonwitness/ui/icons";
import { DistressedSticker, Grain, RansomText, Staple, TactileTape, Tape } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { AtmosphereField } from "@/components/atmosphere";

export function Hero() {
  return (
    <section id="home" className="relative flex min-h-[96vh] items-center overflow-hidden pt-16">
      <Grain />
      <Image
        src={artSrc("hero-witness")}
        alt="A witness in a magenta jacket looking up at the moon over the neon city"
        fill
        priority
        className="object-cover object-[30%_center] filter contrast-[1.15]"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,11,16,0.92)] via-[rgba(11,11,16,0.55)] to-[rgba(11,11,16,0.2)]" />

      {/* Atmospheric FX */}
      <AtmosphereField
        variant="hero"
        interactive
        className="inset-0 z-[1] mix-blend-screen opacity-85"
      />
      <AtmosphereField
        variant="brush"
        seed={7}
        className="inset-0 z-[2] mix-blend-screen opacity-60"
      />

      {/* Grunge Riot Elements */}
      <Splatter className="absolute -left-12 top-20 h-64 w-64 text-[var(--pink)] opacity-80" />
      <Star4
        className="absolute right-[12%] top-28 h-10 w-10 text-[var(--pink)] animate-spin"
        style={{ animationDuration: "12s" }}
      />
      <Bolt className="absolute bottom-28 left-[40%] hidden h-14 w-10 text-[var(--yellow)] md:block" />
      <SafetyPin className="absolute top-28 left-[38%] h-10 w-10 text-white/50 -rotate-45" />

      {/* Barbed wire across the bottom hero border */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex overflow-hidden opacity-40">
        {[...Array(6)].map((_, i) => (
          <BarbedWire key={i} className="h-6 w-60 shrink-0 text-white" />
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-3xl rise-in">
          {/* Street Graffiti Badge & Ransom Title */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <DistressedSticker variant="hazard" text="UNDERGROUND BROADCAST // 1420.4 MHz" />
            <DistressedSticker variant="classified" />
          </div>

          <div className="relative inline-block">
            <Splatter className="absolute -inset-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)] text-[var(--pink)] opacity-90 filter blur-[1px]" />
            <h1 className="cmyk-slip font-brush relative text-[clamp(2.5rem,12vw,4.5rem)] leading-none text-white drop-shadow-[5px_5px_0_rgba(0,0,0,0.9)] sm:text-8xl">
              MOON<span className="text-[var(--pink)]">WITNESS</span>
            </h1>
            <Crown className="absolute -top-8 right-2 h-10 w-14 -rotate-12 text-[var(--yellow)]" />
          </div>

          {/* Ransom Note Tagline */}
          <div className="mt-5">
            <RansomText size="lg">PEOPLE. PLACES. STORIES.</RansomText>
          </div>

          {/* Distressed Dossier Card */}
          <div className="sticker relative mt-6 max-w-lg rotate-[-1deg] p-6 shadow-[8px_8px_0_rgba(0,0,0,0.85)]">
            <Staple className="-top-1 left-6 -rotate-6" />
            <TactileTape
              variant="yellow"
              label="EYEWITNESS_ARCHIVE"
              width={140}
              className="-top-3 right-8 rotate-6 text-[10px]"
            />
            <p className="font-hand text-xl font-black leading-snug sm:text-2xl text-black">
              A global story network for curious humans. Different people. Same moon. Bigger
              perspectives. Unfiltered transmissions from the shadow side.
            </p>
            <div className="mt-4 flex items-center justify-between border-t-2 border-black/20 pt-2 font-mono text-xs text-black/70">
              <span className="font-black">FREQ: 1420.4 MHZ</span>
              <span className="flex items-center gap-1 font-bold">
                <CassetteTape className="h-4 w-6 text-black" /> REEL 09
              </span>
            </div>
          </div>

          {/* Action Button & Punk Sticker */}
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link href="/dock" className="btn-zine px-8 py-4 text-xl shadow-[5px_5px_0_#000]">
              EXPLORE THE SIGNALS <ArrowRight className="h-5 w-5" />
            </Link>
            <DistressedSticker variant="barcode" code="MW-PUNK-2026" className="rotate-3" />
          </div>
        </div>
      </div>

      {/* Floating Street Posters */}
      <div className="absolute right-8 top-28 hidden rotate-6 lg:block z-10">
        <div
          className="sticker float-y px-5 py-4 font-hand text-xl font-bold shadow-[6px_6px_0_rgba(0,0,0,0.7)]"
          style={{ "--rot": "6deg" } as React.CSSProperties}
        >
          <Tape className="-top-2 left-4 -rotate-12" />
          LOOK FURTHER
          <br />
          THAN WE DO.
        </div>
      </div>

      <div className="absolute bottom-24 right-[10%] hidden -rotate-3 lg:block z-10">
        <div
          className="sticker sticker-black float-y border-2 border-[var(--yellow)] px-5 py-4 font-hand text-xl shadow-[6px_6px_0_rgba(0,0,0,0.9)]"
          style={{ "--rot": "-3deg", animationDelay: "1.2s" } as React.CSSProperties}
        >
          <TactileTape variant="black" width={80} className="-top-2 right-2 -rotate-6" />
          SAME MOON.
          <br />
          DIFFERENT WITNESSES.
        </div>
      </div>

      <SkullCrossbonesFunky className="absolute bottom-20 left-[6%] hidden h-12 w-12 -rotate-12 text-[var(--yellow)] md:block" />
      <Smiley className="absolute top-36 right-[28%] hidden h-10 w-10 rotate-12 text-[var(--pink)] md:block" />
    </section>
  );
}
