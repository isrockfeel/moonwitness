"use client";

import { useState } from "react";
import { Marquee } from "@moonwitness/ui";
import { MotionPauseContext } from "@/lib/motion/motion-pause";
import { Star4 } from "@moonwitness/ui/icons";
import { SiteNav } from "../site-nav";
import { About } from "./about";
import { Archive } from "./archive";
import { Crew } from "./crew";
import { Entrance } from "./entrance";
import { LandingFooter } from "./footer";
import { Hero } from "./hero";
import { LandingStoryStrip } from "./story-strip";
import { Shadow } from "./shadow";
import { Signals } from "./signals";
import { Storytelling } from "./storytelling";
import { Transmission } from "./transmission";

const MARQUEE_ITEMS = [
  "SAME MOON",
  "DIFFERENT PEOPLE",
  "BIGGER PERSPECTIVES",
  "ANOTHER SIDE OF REALITY",
  "STORIES KEEP ORBITING",
  "FOLLOW THE SIGNAL",
];

export function Landing() {
  const [paused, setPaused] = useState(false);

  return (
    <MotionPauseContext.Provider value={paused}>
      <div className="relative" data-motion-paused={paused ? "" : undefined}>
        {/* Scene 01 — Entrance: brief decorative ink stamp */}
        <Entrance />

        <SiteNav />

        {/* Scene 02 — MoonWitness Universe: hero */}
        <Hero />

        <LandingStoryStrip />

        <main id="main">
          <Marquee className="border-y-2 border-[var(--line)] bg-[var(--pink)] py-2.5 font-brush text-lg text-white">
            {MARQUEE_ITEMS.map((t) => (
              <span key={t} className="flex items-center gap-8">
                {t} <Star4 className="h-4 w-4 text-[var(--yellow)]" />
              </span>
            ))}
          </Marquee>

          {/* Scene 03 — Transmission 001: featured editorial panel */}
          <Transmission />

          {/* Scene 04 — Storytelling: editorial grid */}
          <Storytelling />

          {/* Existing: Signals section (frequency logs) */}
          <Signals />

          {/* Scene 05 — The Shadow: dark narrative layer */}
          <Shadow />

          {/* Scene 06 — Crew Constellation */}
          <Crew />

          {/* Scene 07 — Signal Archive */}
          <Archive />
        </main>

        {/* Scene 08 — Join the Crew: closing CTA */}
        <About />

        <LandingFooter />

        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className="btn-zine btn-paper fixed bottom-4 left-4 z-40 min-h-11 px-4 py-2 font-mono text-xs motion-reduce:hidden"
        >
          PAUSE MOTION
        </button>
      </div>
    </MotionPauseContext.Provider>
  );
}
