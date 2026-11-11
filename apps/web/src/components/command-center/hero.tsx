import Image from "next/image";
import {
  CassetteTape,
  Crown,
  SkullCrossbonesFunky,
  Splatter,
  SprayCan,
} from "@moonwitness/ui/icons";
import { DistressedSticker, RansomText, Staple, TactileTape } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { AtmosphereField } from "@/components/atmosphere";

const STRIP = ["OFF-GRID PIRATE CONSOLE", "CREATE · CURATE · TRANSMIT", "FREQUENCY: 1420.4 MHz"];

export function CommandHero() {
  return (
    <div className="grain relative overflow-hidden border-b-2 border-black bg-black">
      <Image
        src={artSrc("shadow-command")}
        alt=""
        fill
        priority
        className="object-cover object-[65%_35%] filter contrast-125"
        sizes="(max-width: 1024px) 100vw, 80vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(7,7,12,0.96)] via-[rgba(7,7,12,0.65)] to-[rgba(7,7,12,0.3)]" />
      <AtmosphereField
        variant="hero"
        interactive
        className="inset-0 z-[1] mix-blend-screen opacity-75"
      />
      <AtmosphereField
        variant="brush"
        seed={11}
        className="inset-0 z-[2] mix-blend-screen opacity-55"
      />
      <Splatter className="absolute -left-6 top-6 h-40 w-40 text-[var(--pink)] opacity-70" />

      {/* Tactile tape accents on hero boundary */}
      <TactileTape
        variant="yellow"
        label="AUTHORIZED OPERATIVES ONLY"
        width={220}
        className="-top-1 right-12 rotate-2 text-[10px]"
      />
      <Staple className="top-3 left-4 -rotate-45" />

      <div className="relative z-10 px-4 py-12 sm:px-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <DistressedSticker variant="hazard" text="SECRET BASE // OPS DECK" />
          <DistressedSticker variant="barcode" code="SCC-NODE-00" className="rotate-2" />
        </div>

        <div className="relative inline-block">
          <h1
            id="cc-top"
            className="cmyk-slip scroll-mt-24 font-brush text-4xl leading-none text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.9)] sm:text-6xl"
          >
            SHADOW <span className="text-[var(--pink)]">COMMAND</span> CENTER
          </h1>
          <Crown className="absolute -top-7 right-0 h-8 w-12 -rotate-12 text-[var(--yellow)]" />
        </div>

        <p className="mt-4 max-w-xl font-mono text-xs leading-relaxed text-zinc-300">
          Coordinate pirate stories, field surveillance, clandestine audio feeds, and automated leak
          workflows. Broadcast unfiltered perspectives directly to the nocturnal mesh.
        </p>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[var(--yellow)] font-bold">
          {STRIP.map((w, i) => (
            <span key={w} className="flex items-center gap-3">
              {i > 0 && <span className="text-zinc-600">//</span>}
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
