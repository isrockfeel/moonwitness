"use client";

import { EmpireShell } from "@/components/shell";
import { LogView } from "@/views/log";
import { DistressedSticker } from "@moonwitness/ui";

export default function LogPage() {
  return (
    <EmpireShell breadcrumb="Mission Log // History">
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker variant="classified" text="ENCRYPTED TELEMETRY" className="mb-2" />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              MISSION <span className="text-[var(--pink)]">LOGS</span>
            </h1>
          </div>
          <DistressedSticker variant="barcode" code="MOD-LOG-06" />
        </div>

        <LogView />
      </div>
    </EmpireShell>
  );
}
