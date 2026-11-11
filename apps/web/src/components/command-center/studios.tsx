import type { Module } from "@moonwitness/types";
import { ModuleCard } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

const STUDIO_IDS = ["story-forge", "poster-lab"];

export interface StudiosProps {
  modules: Module[];
  onOpen: (m: Module) => void;
}

export function Studios({ modules, onOpen }: StudiosProps) {
  const studios = STUDIO_IDS.map((id) => modules.find((m) => m.id === id)).filter(
    (m): m is Module => Boolean(m),
  );
  return (
    <section aria-labelledby="cc-studios" className="scroll-mt-24">
      <SectionHeading id="cc-studios" title="STORY STUDIO" accent="/ POSTER FORGE" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {studios.map((m) => (
          <ModuleCard key={m.id} module={m} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
