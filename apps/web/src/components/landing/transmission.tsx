"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bolt, Star4, CassetteTape } from "@moonwitness/ui/icons";
import { DistressedSticker, Grain, Staple, TactileTape } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";
import { AtmosphereField } from "@/components/atmosphere";

export function Transmission() {
  const [ref, visible] = useScrollReveal(0.1, "0px 0px -40px 0px");

  if (!visible) {
    return <div ref={ref} className="opacity-0" />;
  }

  return (
    <section
      id="transmission"
      ref={ref}
      className="relative scroll-mt-20 overflow-hidden border-y-2 border-[var(--line)] bg-[var(--ink)] py-20 opacity-0 transition-opacity duration-700"
    >
      <Grain />

      {/* Atmospheric FX */}
      <AtmosphereField
        variant="brush"
        seed={3}
        className="inset-0 z-[1] mix-blend-screen opacity-40"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* Transmission badge & number */}
        <div className="mb-8 flex items-center gap-4">
          <DistressedSticker variant="hazard" text="TRANSMISSION 001" />
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-[var(--yellow)]">
            <CassetteTape className="h-3 w-4" />
            EYEWITNESS FEED — LIVE
          </div>
          <Star4 className="ml-auto h-6 w-6 animate-spin text-[var(--pink)]" style={{ animationDuration: "8s" }} />
        </div>

        {/* Comic-panel editorial layout */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Left: large featured artwork panel */}
          <div className="group relative overflow-hidden border-2 border-[var(--line)] bg-[var(--panel)]">
            <Staple className="-top-1 left-6 -rotate-12" />
            <TactileTape
              variant="yellow"
              label="SIGNAL LOG"
              width={100}
              className="-top-2 right-4 rotate-3 text-[9px]"
            />
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={artSrc("fog-voices")}
                alt="Fog rolling through a city street at night — a witness watches from the shadows"
                fill
                className="object-cover grayscale contrast-125 transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 60vw"
              />
              {/* Halftone + tint overlay */}
              <div className="absolute inset-0 bg-[var(--pink)] mix-blend-color opacity-25" />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(0,0,0,0.6) 1px, transparent 1.5px)",
                  backgroundSize: "3px 3px",
                  mixBlendMode: "multiply",
                }}
              />
            </div>

            {/* Panel caption — comic style */}
            <div className="border-t-2 border-[var(--line)] bg-[var(--panel)] p-5">
              <p className="font-mono text-[10px] tracking-widest text-[var(--blue)]">
                NARRATIVE FRAGMENT // CLASSIFIED
              </p>
              <h3 className="mt-2 font-brush text-2xl leading-tight text-white sm:text-3xl">
                THE VOICES IN THE <span className="text-[var(--pink)]">FOG</span>
              </h3>
              <p className="mt-3 font-mono text-sm leading-relaxed text-zinc-400">
                Three witnesses independently reported hearing unexplained frequencies
                emanating from the old textile district. All three described the same
                pattern — ascending, then descending, like a signal being answered.
              </p>
            </div>
          </div>

          {/* Right: sidebar annotation panels */}
          <div className="flex flex-col gap-4">
            {/* Annotation card 1 */}
            <article className="zine-card-rough relative p-5">
              <div className="font-brush text-xl text-[var(--yellow)]">KEY DETAIL</div>
              <p className="mt-2 font-mono text-xs leading-relaxed text-zinc-300">
                Frequency analysis suggests modulation consistent with non-standard
                broadcast sources. Multiple independent recordings confirm the pattern.
              </p>
              <DistressedSticker
                variant="barcode"
                code="FREQ-1420-α"
                className="mt-3 -rotate-2"
              />
            </article>

            {/* Annotation card 2 */}
            <article className="zine-card-rough relative p-5">
              <div className="font-brush text-xl text-[var(--pink)]">WITNESS ACCOUNT</div>
              <blockquote className="mt-2 border-l-2 border-[var(--pink)] pl-4 font-hand text-base italic text-zinc-200">
                &ldquo;It wasn&rsquo;t coming from any tower I recognised. It was
                in the walls.&rdquo;
              </blockquote>
              <p className="mt-2 font-mono text-[10px] text-zinc-500">— Witness #MW-0447, London</p>
            </article>

            {/* CTA panel */}
            <Link
              href="/dock"
              className="group mt-auto flex items-center justify-between border-2 border-[var(--pink)] bg-[var(--panel)] p-5 transition-all hover:bg-[var(--pink)] hover:text-[var(--ink)] md:flex-col md:text-center md:gap-3"
            >
              <span className="font-brush text-lg font-black transition-colors group-hover:text-[var(--ink)]">
                READ THE FULL TRANSMISSION
              </span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative hand-drawn elements */}
      <Bolt className="absolute -bottom-6 -left-6 hidden h-20 w-16 text-[var(--yellow)] opacity-40 md:block" />
      <Bolt className="absolute -right-4 top-1/3 hidden h-16 w-12 rotate-45 text-[var(--pink)] opacity-30 md:block" />
    </section>
  );
}
