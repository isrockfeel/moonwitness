import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Crown } from "@moonwitness/ui/icons";
import { Grain } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";

export function About() {
  return (
    <section
      id="about"
      className="relative scroll-mt-20 overflow-hidden border-t-2 border-[var(--line)]"
    >
      <Grain />
      <Image
        src={artSrc("crew-rooftop")}
        alt=""
        fill
        className="object-cover object-center opacity-40"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[rgba(11,11,16,0.6)] to-[rgba(11,11,16,0.8)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <Crown className="mx-auto mb-4 h-10 w-14 text-[var(--yellow)]" />
        <h2 className="font-brush text-5xl leading-tight text-[var(--pink)] drop-shadow-[3px_3px_0_rgba(0,0,0,0.9)] sm:text-7xl">
          JOIN THE CREW
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-hand text-2xl text-zinc-200">
          More stories. More places. More perspectives. A brighter world.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/shadow" className="btn-zine btn-paper px-8 py-4 text-xl">
            BECOME A MOONWITNESS <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/mission-control" className="btn-zine btn-blue px-8 py-4 text-xl">
            MISSION CONTROL
          </Link>
        </div>
        <div className="sticker sticker-yellow mx-auto mt-10 inline-block rotate-2 px-4 py-2 font-hand text-lg font-bold">
          STORIES KEEP ORBITING.
        </div>
      </div>
    </section>
  );
}
