import Image from "next/image";
import Link from "next/link";
import { Crown, Splatter } from "@moonwitness/ui/icons";
import { DistressedSticker, Staple, TactileTape } from "@moonwitness/ui";
import type { Project } from "@moonwitness/types";
import { artSrc } from "@/lib/art";
import { AtmosphereField } from "@/components/atmosphere";

export function CommandHero({ project }: { project: Project }) {
  return (
    <div className="grain relative overflow-hidden border-b-2 border-black bg-black">
      <Image
        src={artSrc(project.image)}
        alt=""
        fill
        priority
        className="object-cover object-[65%_50%] filter contrast-125"
        sizes="(max-width: 1024px) 100vw, 80vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(7,7,12,0.94)] via-[rgba(7,7,12,0.64)] to-[rgba(7,7,12,0.2)]" />
      <AtmosphereField
        variant="hero"
        interactive
        className="inset-0 z-[1] mix-blend-screen opacity-55"
      />
      <AtmosphereField
        variant="brush"
        seed={11}
        className="inset-0 z-[2] mix-blend-screen opacity-35"
      />
      <Splatter className="absolute -left-6 top-6 h-40 w-40 text-[var(--pink)] opacity-70" />

      <Staple className="top-3 left-4 -rotate-45" />

      <TactileTape
        variant="yellow"
        label="FEATURED PROJECT"
        width={190}
        className="-top-1 right-8 rotate-2 text-[10px]"
      />
      <div className="relative z-10 flex min-h-[280px] items-center px-6 py-10 sm:min-h-[320px] sm:px-10 lg:px-12">
        <div className="max-w-2xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <DistressedSticker variant="hazard" text="IN PROGRESS" />
            <DistressedSticker variant="barcode" code={`${project.progress}% COMPLETE`} className="rotate-2" />
          </div>
          <h1
            id="cc-top"
            className="cmyk-slip scroll-mt-24 max-w-full font-brush text-5xl leading-[0.95] text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.9)] sm:text-6xl lg:text-7xl"
          >
            {project.title.toUpperCase()}
          </h1>
          <p className="mt-4 font-mono text-xs font-bold tracking-[0.18em] text-[var(--yellow)]">
            {project.status.toUpperCase()} // STORY WORLD
          </p>
          <Link
            href={`/dock?q=${encodeURIComponent(project.title)}`}
            className="btn-zine mt-5 inline-flex min-h-11 items-center gap-2 px-5 py-2.5 text-sm"
          >
            OPEN PROJECT <span aria-hidden="true">→</span>
          </Link>
        </div>
        <Crown className="absolute right-[20%] top-12 h-10 w-14 -rotate-12 text-[var(--yellow)]" />
      </div>
    </div>
  );
}
