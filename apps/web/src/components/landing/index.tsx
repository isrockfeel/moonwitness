"use client";

import { Marquee } from "@moonwitness/ui";
import { Star4 } from "@moonwitness/ui/icons";
import { SiteNav } from "../site-nav";
import { Archive } from "./archive";
import { Crew } from "./crew";
import { Entrance } from "./entrance";
import { LandingFooter } from "./footer";
import { Hero } from "./hero";
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
  return (
    <div className="relative">
      {/* Scene 01 — Entrance: full-screen intro overlay */}
      <Entrance />

      <SiteNav />

      {/* Scene 02 — MoonWitness Universe: hero */}
      <Hero />

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

      {/* Scene 08 — Join the Crew: closing CTA (in About component) */}
      <div id="about" className="relative scroll-mt-20">
        <AboutCta />
      </div>

      <LandingFooter />
    </div>
  );
}

// Extracted from original about.tsx — same content, kept as a separate component
// so it can be wired directly into the scene 08 position.
import { About as AboutCta } from "./about";
