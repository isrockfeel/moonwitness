"use client";

import { EmpireShell } from "@/components/shell";
import { Studios } from "@/components/command-center/studios";
import { modules } from "@/lib/data";
import { DistressedSticker } from "@moonwitness/ui";
import Link from "next/link";
import { ArrowRight } from "@moonwitness/ui/icons";

export default function StudiosHubPage() {
  return (
    <EmpireShell breadcrumb="Creative Studios Hub">
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker
              variant="hazard"
              text="UNDERGROUND PRODUCTION LABS"
              className="mb-2"
            />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              CREATIVE <span className="text-[var(--pink)]">STUDIOS</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <Link href="/studios/story-forge" className="btn-zine btn-yellow px-4 py-2 text-xs">
              STORY FORGE <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/studios/poster-lab" className="btn-zine btn-blue px-4 py-2 text-xs">
              POSTER LAB <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <Studios modules={modules} onOpen={() => {}} />
      </div>
    </EmpireShell>
  );
}
