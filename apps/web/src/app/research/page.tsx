"use client";

import { EmpireShell } from "@/components/shell";
import { ResearchView } from "@/views/research";
import { DistressedSticker } from "@moonwitness/ui";

export default function ResearchPage() {
  return (
    <EmpireShell breadcrumb="Research // Field Notes">
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker variant="hazard" text="FIELD INTELLIGENCE" className="mb-2" />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              RESEARCH <span className="text-[var(--pink)]">& FIELD WORK</span>
            </h1>
          </div>
          <DistressedSticker variant="barcode" code="MOD-RES-05" />
        </div>

        <ResearchView />
      </div>
    </EmpireShell>
  );
}
