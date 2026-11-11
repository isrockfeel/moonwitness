import Image from "next/image";
import Link from "next/link";
import type { Project } from "@moonwitness/types";
import { artSrc } from "@/lib/art";
import { SectionHeading } from "./section-heading";

export function ProjectUniverse({ projects }: { projects: Project[] }) {
  return (
    <section aria-labelledby="cc-projects-heading" className="scroll-mt-24">
      <SectionHeading
        id="cc-projects-heading"
        title="PROJECT"
        accent="UNIVERSE"
        note={`${projects.length} tracked`}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/dock?q=${encodeURIComponent(p.title)}`}
            className="group min-w-0 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel-2)]"
          >
            <div className="relative h-20 overflow-hidden">
              <Image
                src={artSrc(p.image)}
                alt=""
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ objectPosition: p.imagePosition }}
                sizes="160px"
              />
              <span className="absolute bottom-1 left-1 font-brush text-[11px] leading-tight text-white drop-shadow-[1px_1px_0_#000]">
                {p.title.toUpperCase()}
              </span>
            </div>
            <div className="p-2">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{ background: `${p.color}22`, color: p.color }}
              >
                {p.status}
              </span>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--line)]">
                <div className="h-full" style={{ width: `${p.progress}%`, background: p.color }} />
              </div>
              <div className="mt-1 text-right text-[9px] text-zinc-500">{p.progress}%</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
