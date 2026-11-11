"use client";

import { EmpireShell } from "@/components/shell";
import { CollectionsView } from "@/views/collections";
import { DistressedSticker } from "@moonwitness/ui";

export default function CollectionsPage() {
  return (
    <EmpireShell breadcrumb="Collections // Archive">
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker variant="classified" text="VAULT DOSSIER" className="mb-2" />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              ARCHIVED <span className="text-[var(--blue)]">COLLECTIONS</span>
            </h1>
          </div>
          <DistressedSticker variant="barcode" code="MOD-COLLECT-03" />
        </div>

        <CollectionsView />
      </div>
    </EmpireShell>
  );
}
