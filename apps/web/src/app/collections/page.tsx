"use client";

import { EmpireShell } from "@/components/shell";
import { Collections } from "@/components/command-center/collections";
import { collections } from "@/lib/data";
import { DistressedSticker } from "@moonwitness/ui";

export default function CollectionsPage() {
  return (
    <EmpireShell breadcrumb="Universe Collections">
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker variant="classified" text="EVIDENCE COMPILATIONS" className="mb-2" />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              UNIVERSE <span className="text-[var(--yellow)]">COLLECTIONS</span>
            </h1>
          </div>
          <DistressedSticker variant="foil" text="CURATED TAPES" />
        </div>

        <Collections collections={collections} onOpenCollection={() => {}} />
      </div>
    </EmpireShell>
  );
}

