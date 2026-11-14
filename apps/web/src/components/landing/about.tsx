"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Crown } from "@moonwitness/ui/icons";
import { Grain } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

const EASE = "var(--ease-ink-out)";

function layerStyle(
  revealed: boolean,
  duration: number,
  delay: number,
  hidden: string,
): CSSProperties {
  return {
    transition: `opacity ${duration}s ${EASE} ${delay}s, transform ${duration}s ${EASE} ${delay}s`,
    opacity: revealed ? 1 : 0,
    transform: revealed ? "none" : hidden,
  };
}

export function About() {
  const [ref, revealed] = useScrollReveal(0.2);

  return (
    <section
      ref={ref}
      id="about"
      className="relative scroll-mt-20 overflow-hidden border-t-2 border-[var(--line)]"
    >
      <div
        data-join-layer="paper"
        aria-hidden="true"
        className="absolute inset-0 motion-reduce:!transition-none"
        style={layerStyle(revealed, 0.7, 0, "scale(1.06)")}
      >
        <Grain />
        <Image
          src={artSrc("crowd-moon")}
          alt=""
          fill
          className="object-cover object-[50%_35%] opacity-60"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[rgba(11,11,16,0.6)] to-[rgba(11,11,16,0.8)]" />
      </div>
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <div
          data-join-layer="type"
          className="motion-reduce:!transition-none"
          style={layerStyle(revealed, 0.55, 0.25, "translateY(28px)")}
        >
          <Crown className="mx-auto mb-4 h-10 w-14 text-[var(--yellow)]" />
          <h2 className="font-brush text-5xl leading-tight text-[var(--pink)] drop-shadow-[3px_3px_0_rgba(0,0,0,0.9)] sm:text-7xl">
            JOIN THE CREW
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-hand text-2xl text-zinc-200">
            More stories. More places. More perspectives. A brighter world.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/shadow" className="btn-zine btn-paper px-8 py-4 text-xl">
            BECOME A MOONWITNESS <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/mission-control" className="btn-zine btn-blue px-8 py-4 text-xl">
            MISSION CONTROL
          </Link>
        </div>
        <div
          data-join-layer="ink"
          aria-hidden="true"
          className="mt-10 motion-reduce:!transition-none"
          style={layerStyle(revealed, 0.45, 0.5, "rotate(-8deg) scale(0.8)")}
        >
          <div className="sticker sticker-yellow mx-auto inline-block rotate-2 px-4 py-2 font-hand text-lg font-bold">
            STORIES KEEP ORBITING.
          </div>
        </div>
      </div>
    </section>
  );
}
