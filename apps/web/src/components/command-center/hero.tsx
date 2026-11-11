import Image from "next/image";
import { Crown, Splatter } from "@moonwitness/ui/icons";
import { artSrc } from "@/lib/art";
import { AtmosphereField } from "@/components/atmosphere";

const STRIP = ["PRIVATE", "CREATE · CURATE · DEPLOY"];

export function CommandHero() {
  return (
    <div className="grain relative overflow-hidden border-b-2 border-[var(--line)]">
      <Image
        src={artSrc("shadow-command")}
        alt=""
        fill
        priority
        className="object-cover object-[65%_35%]"
        sizes="(max-width: 1024px) 100vw, 80vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,11,16,0.92)] via-[rgba(11,11,16,0.55)] to-transparent" />
      <AtmosphereField
        variant="hero"
        interactive
        className="inset-0 z-[1] mix-blend-screen opacity-70"
      />
      <AtmosphereField
        variant="brush"
        seed={11}
        className="inset-0 z-[2] mix-blend-screen opacity-50"
      />
      <Splatter className="absolute -left-6 top-6 h-32 w-32 text-[var(--pink)] opacity-60" />
      <div className="relative z-10 px-4 py-10 sm:px-8">
        <div className="relative inline-block">
          <h1
            id="cc-top"
            className="scroll-mt-24 font-brush text-4xl leading-none text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] sm:text-6xl"
          >
            SHADOW <span className="text-[var(--pink)]">COMMAND</span> CENTER
          </h1>
          <Crown className="absolute -top-5 right-0 h-6 w-9 -rotate-12 text-[var(--yellow)]" />
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">
          Coordinate stories, research, world signals, AI workflows, and publishing operations.
          Different people. Same sky. A brighter tomorrow for a bolder humanity.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-brush text-sm text-[var(--yellow)]">
          {STRIP.map((w, i) => (
            <span key={w} className="flex items-center gap-4">
              {i > 0 && <span className="text-zinc-500">//</span>}
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
