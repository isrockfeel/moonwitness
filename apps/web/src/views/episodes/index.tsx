"use client";

import { Workspace } from "@/components/command-center/workspace";
import { Pipeline } from "@/components/command-center/pipeline";
import { pipeline, workspaceItems } from "@/lib/data";
import { DistressedSticker } from "@moonwitness/ui";

export function EpisodesView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DistressedSticker variant="hazard" text="EDITORIAL WORKSPACE" />
          </div>
          <h1 className="cmyk-slip font-brush text-4xl text-white">
            EPISODES <span className="text-[var(--pink)]">& PIPELINE</span>
          </h1>
        </div>
        <DistressedSticker variant="barcode" code="EP-KANBAN-01" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Workspace items={workspaceItems} onOpenItem={() => {}} />
        <Pipeline columns={pipeline} onOpenCard={() => {}} />
      </div>
    </div>
  );
}
