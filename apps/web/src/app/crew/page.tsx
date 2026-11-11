"use client";

import { EmpireShell } from "@/components/shell";
import { CrewView } from "@/views/crew";
import { DistressedSticker } from "@moonwitness/ui";

export default function CrewPage() {
  return (
    <EmpireShell breadcrumb="Crew // Agents">
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker variant="foil" text="ACTIVE CELLS" className="mb-2" />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              EMPIRE <span className="text-[var(--yellow)]">CREW</span>
            </h1>
          </div>
          <DistressedSticker variant="barcode" code="MOD-CREW-04" />
        </div>

        <CrewView />
      </div>
    </EmpireShell>
  );
}
