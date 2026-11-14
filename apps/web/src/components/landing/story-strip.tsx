import Image from "next/image";
import Link from "next/link";
import type { ArtKey } from "@moonwitness/types";
import { ArrowRight, Crown } from "@moonwitness/ui/icons";
import { artSrc } from "@/lib/art";

const PANELS: {
  label: string;
  title: string;
  art: ArtKey;
  href: string;
}[] = [
  { label: "PEOPLE", title: "THE BATTERIES", art: "night-shift", href: "#storytelling" },
  { label: "PLACES", title: "NEON CITIES", art: "city-shadow", href: "#storytelling" },
  { label: "STORIES", title: "PENDETA ONLINE", art: "signal-sky", href: "#storytelling" },
  { label: "WORLDS", title: "ZILL", art: "mirror-archive", href: "#storytelling" },
];

export function LandingStoryStrip() {
  return (
    <section
      aria-label="Explore the Moonwitness story world"
      className="relative z-10 -mt-2 border-y-2 border-[var(--paper)] bg-black px-3 py-4 sm:px-6 sm:py-5"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {PANELS.map((panel, index) => (
          <Link
            key={panel.label}
            href={panel.href}
            className={`comic-panel group relative block aspect-[1.65] min-h-28 border-[var(--paper)] transition-transform hover:-translate-y-1 motion-reduce:transition-none ${
              index % 2 === 0 ? "-rotate-[0.7deg]" : "rotate-[0.7deg]"
            }`}
          >
            <Image
              src={artSrc(panel.art)}
              alt=""
              fill
              sizes="(max-width: 767px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
            <span className="absolute left-2 top-2 bg-[var(--yellow)] px-2 py-1 font-mono text-[9px] font-black tracking-widest text-black sm:left-3 sm:top-3">
              {panel.label}
            </span>
            <span className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-2 font-brush text-sm text-white drop-shadow-[2px_2px_0_#111] sm:inset-x-3 sm:bottom-3 sm:text-xl">
              {panel.title}
              {index === 0 ? (
                <Crown aria-hidden="true" className="h-5 w-7 shrink-0 text-[var(--yellow)]" />
              ) : (
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[var(--pink)] transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                />
              )}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
