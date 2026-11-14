"use client";

import Image from "next/image";
import { ARTWORK } from "@moonwitness/assets";
import type { ArtKey } from "@moonwitness/types";
import { SprayCan } from "@moonwitness/ui/icons";
import { Halftone, Staple, TactileTape } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

interface StoryUnit {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  excerpt: string;
  art: ArtKey;
  marginalia: string;
  rotation: number;
}

const STORIES: StoryUnit[] = [
  {
    id: "s1",
    tag: "PEOPLE",
    tagColor: "var(--pink)",
    title: "THE BATTERIES",
    excerpt:
      "A garage band in Jakarta channels something older than rock'n'roll — frequencies that predate electricity.",
    art: "night-shift",
    marginalia: "// jakarta // night session",
    rotation: -1.5,
  },
  {
    id: "s2",
    tag: "PLACES",
    tagColor: "var(--blue)",
    title: "NEON CITIES",
    excerpt:
      "Mapping the underground circuit of cities that never sleep — Seoul, Istanbul, Lagos. The skyline tells a different story at 3 AM.",
    art: "city-shadow",
    marginalia: "// skyline // 3am frequency",
    rotation: 1,
  },
  {
    id: "s3",
    tag: "STORIES",
    tagColor: "var(--yellow)",
    title: "PENDETA ONLINE",
    excerpt:
      "A spiritual guide in rural Malaysia receives what he calls ‘signals from the other side’ — transmitted through prayer and radio static.",
    art: "signal-sky",
    marginalia: "// prayer × radio // malay realm",
    rotation: -0.8,
  },
  {
    id: "s4",
    tag: "WORLDS",
    tagColor: "var(--purple)",
    title: "ZILL",
    excerpt:
      "A fiction project that reads like a field report. A city that might not exist, documented by someone who swears they were there.",
    art: "mirror-archive",
    marginalia: "// urban legend or // field report?",
    rotation: 1.2,
  },
];

const SETTLE_S = 0.55;
const STAGGER_S = 0.1;

export function Storytelling() {
  const [revealRef, revealed] = useScrollReveal(0.1, "0px 0px -40px 0px");

  return (
    <section
      id="storytelling"
      className="relative scroll-mt-20 overflow-x-clip bg-[var(--ink)] py-24"
    >
      <Halftone tone="pink" className="pointer-events-none absolute inset-0 opacity-20" />

      <div ref={revealRef} className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 border-b-2 border-dashed border-zinc-800 pb-6">
          <div className="mb-2 flex items-center gap-2">
            <SprayCan className="h-5 w-5 text-[var(--pink)]" />
            <span className="font-mono text-xs font-black tracking-widest text-[var(--yellow)]">
              STORY WORLD // FICTION FILES
            </span>
          </div>
          <h2 className="cmyk-slip font-brush text-4xl text-white sm:text-5xl">
            STRANGE PEOPLE.{" "}
            <span className="text-[var(--pink)] brush-underline">BIGGER HORIZONS.</span>
          </h2>
        </div>

        <div className="flex flex-col gap-10">
          {STORIES.map((story, i) => {
            const artRight = i % 2 === 1;
            const art = ARTWORK[story.art];
            return (
              <div
                key={story.id}
                data-story-unit
                className="transition-[opacity,transform] ease-[var(--ease-ink-out)] motion-reduce:transition-none"
                style={{
                  transitionDuration: `${SETTLE_S}s`,
                  transitionDelay: `${i * STAGGER_S}s`,
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? "none" : `translateX(${artRight ? 40 : -40}px)`,
                }}
              >
                <div style={{ transform: `rotate(${story.rotation}deg)` }}>
                  <article
                    className={`group zine-card-rough relative grid overflow-hidden transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none md:grid-cols-2 ${
                      artRight ? "md:[&>figure]:order-2" : ""
                    }`}
                  >
                    <Staple className="-top-1 left-5 z-10 -rotate-12" />
                    <TactileTape
                      variant="black"
                      label={story.tag}
                      width={70}
                      className="-top-2 right-4 z-10 rotate-3 text-[9px]"
                    />
                    <figure className="relative aspect-[4/3] w-full">
                      <Image
                        src={artSrc(story.art)}
                        alt={art.alt}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                        style={{ objectPosition: art.position }}
                      />
                    </figure>
                    <div className="relative px-6 py-7">
                      <span
                        className="font-mono text-[10px] font-black tracking-widest"
                        style={{ color: story.tagColor }}
                      >
                        [{story.tag}]
                      </span>
                      <h3 className="cmyk-slip mt-3 font-brush text-2xl leading-tight text-white transition-colors group-hover:text-[var(--pink)]">
                        {story.title}
                      </h3>
                      <p className="mt-3 font-mono text-sm leading-relaxed text-zinc-400">
                        {story.excerpt}
                      </p>
                      <div
                        aria-hidden="true"
                        className="marginalia -right-2 bottom-4 text-sm opacity-40 transition-opacity group-hover:opacity-70"
                      >
                        {story.marginalia}
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
