"use client";

import { useEffect, useRef } from "react";
import { Crown, SprayCan } from "@moonwitness/ui/icons";
import { Halftone, Staple, TactileTape } from "@moonwitness/ui";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";

interface StoryCard {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  excerpt: string;
  note?: string;
  rotation?: number;
}

const STORIES: StoryCard[] = [
  {
    id: "s1",
    tag: "PEOPLE",
    tagColor: "var(--pink)",
    title: "THE BATTERIES",
    excerpt: "A garage band in Jakarta channels something older than rock'n'roll — frequencies that predate electricity.",
    note: "First transmission: March 2024",
    rotation: -1.5,
  },
  {
    id: "s2",
    tag: "PLACES",
    tagColor: "var(--blue)",
    title: "NEON CITIES",
    excerpt: "Mapping the underground circuit of cities that never sleep — Seoul, Istanbul, Lagos. The skyline tells a different story at 3 AM.",
    note: "Ongoing collection",
    rotation: 1,
  },
  {
    id: "s3",
    tag: "STORIES",
    tagColor: "var(--yellow)",
    title: "PENDETA ONLINE",
    excerpt: "A spiritual guide in rural Malaysia receives what he calls &lsquo;signals from the other side&rsquo; — transmitted through prayer and radio static.",
    note: "Episodes 1–6 published",
    rotation: -0.8,
  },
  {
    id: "s4",
    tag: "WORLDS",
    tagColor: "var(--purple)",
    title: "ZILL",
    excerpt: "A fiction project that reads like a field report. A city that might not exist, documented by someone who swears they were there.",
    note: "World bible in progress",
    rotation: 1.2,
  },
];

export function Storytelling() {
  const [revealRef, revealed] = useScrollReveal(0.1, "0px 0px -40px 0px");
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!revealed) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
      card.style.transition = `opacity 0.6s ${ease} ${i * 0.12}s, transform 0.6s ${ease} ${i * 0.12}s`;
      card.style.opacity = "1";
      card.style.transform = "rotate(0deg)";
    });
  }, [revealed]);

  return (
    <section id="storytelling" className="relative scroll-mt-20 bg-[var(--ink)] py-24">
      <Halftone tone="pink" className="pointer-events-none absolute inset-0 opacity-20" />

      <div
        ref={revealRef}
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 transition-all duration-700 ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <SprayCan className="h-5 w-5 text-[var(--pink)]" />
              <span className="font-mono text-xs font-black tracking-widest text-[var(--yellow)]">
                NARRATIVE COLLECTIVE // FIELD REPORTS
              </span>
            </div>
            <h2 className="cmyk-slip font-brush text-4xl text-white sm:text-5xl">
              REAL PEOPLE.{" "}
              <span className="text-[var(--pink)] brush-underline">BIGGER HORIZONS.</span>
            </h2>
          </div>
          <Crown className="hidden h-10 w-14 text-[var(--yellow)] rotate-6 sm:block" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {STORIES.map((story, i) => (
            <div
              key={story.id}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="group zine-card-rough relative flex flex-col overflow-hidden opacity-0"
              style={{
                transform: `rotate(${story.rotation ?? 0}deg)`,
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "rotate(0deg) translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = `rotate(${story.rotation ?? 0}deg)`;
              }}
            >
              <Staple className="-top-1 left-5 -rotate-12" />
              <TactileTape
                variant="black"
                label={story.tag}
                width={70}
                className="-top-2 right-4 rotate-3 text-[9px]"
              />

              <div className="px-6 py-7 flex-1">
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="font-mono text-[10px] font-black tracking-widest"
                    style={{ color: story.tagColor }}
                  >
                    [{story.tag}]
                  </span>
                  {story.note && (
                    <span className="font-mono text-[10px] text-zinc-600">{story.note}</span>
                  )}
                </div>

                <h3 className="cmyk-slip font-brush text-2xl leading-tight text-white group-hover:text-[var(--pink)] transition-colors">
                  {story.title}
                </h3>

                <p className="mt-3 font-mono text-sm leading-relaxed text-zinc-400">
                  {story.excerpt}
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <span className="btn-zine btn-paper text-xs shadow-[2px_2px_0_#000] px-4 py-2">
                    READ MORE →
                  </span>
                </div>
              </div>

              <div className="marginalia -right-2 bottom-4 text-sm opacity-40 group-hover:opacity-70 transition-opacity">
                {story.id === "s1" && "// jakarta // night session"}
                {story.id === "s2" && "// skyline // 3am frequency"}
                {story.id === "s3" && "// prayer × radio // malay realm"}
                {story.id === "s4" && "// urban legend or // field report?"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
