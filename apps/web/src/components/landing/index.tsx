"use client";

import { Marquee } from "@moonwitness/ui";
import { Star4 } from "@moonwitness/ui/icons";
import { SiteNav } from "../site-nav";
import { About } from "./about";
import { Archive } from "./archive";
import { Crew } from "./crew";
import { LandingFooter } from "./footer";
import { Hero } from "./hero";
import { Signals } from "./signals";

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
      <SiteNav />
      <Hero />
      <main id="main">
        <Marquee className="border-y-2 border-[var(--line)] bg-[var(--pink)] py-2.5 font-brush text-lg text-white">
          {MARQUEE_ITEMS.map((t) => (
            <span key={t} className="flex items-center gap-8">
              {t} <Star4 className="h-4 w-4 text-[var(--yellow)]" />
            </span>
          ))}
        </Marquee>
        <Signals />
        <Crew />
        <Archive />
        <About />
      </main>
      <LandingFooter />
    </div>
  );
}
