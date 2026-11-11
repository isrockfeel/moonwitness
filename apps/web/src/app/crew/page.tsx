import { EmpireShell } from "@/components/shell";
import { CrewOrbit } from "@/components/command-center/crew";
import { ProjectUniverse } from "@/components/command-center/projects";
import { projects } from "@/lib/data";
import { DistressedSticker } from "@moonwitness/ui";

export const metadata = { title: "Crew & Operatives — Moonwitness" };

export default function CrewPage() {
  return (
    <EmpireShell breadcrumb="Operatives // Orbit">
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker variant="hazard" text="UNDERGROUND CELLS ROSTER" className="mb-2" />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              CREW <span className="text-[var(--pink)]">CONSTELLATION</span>
            </h1>
          </div>
          <DistressedSticker variant="foil" text="ACTIVE AGENTS" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CrewOrbit />
          <ProjectUniverse projects={projects} />
        </div>
      </div>
    </EmpireShell>
  );
}
