import { CrewConstellation } from "@moonwitness/ui";
import { crewStats, witnesses } from "@/lib/data";
import { AtmosphereField } from "@/components/atmosphere";
import { SectionHeading } from "./section-heading";

export function CrewOrbit() {
  return (
    <section aria-labelledby="cc-crew" className="scroll-mt-24">
      <SectionHeading
        id="cc-crew"
        title="CREW"
        accent="ORBIT"
        note={`${witnesses.length} witnesses`}
      />
      <CrewConstellation
        witnesses={witnesses}
        stats={crewStats}
        backdrop={<AtmosphereField variant="crew" className="inset-0 mix-blend-screen opacity-70" />}
      />
    </section>
  );
}
