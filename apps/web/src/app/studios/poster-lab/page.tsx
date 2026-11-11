"use client";

import { EmpireShell } from "@/components/shell";
import { PosterStudioView } from "@/views/studios/poster-studio";

export default function PosterLabPage() {
  return (
    <EmpireShell breadcrumb="Studios // Poster Studio">
      <div className="px-4 py-8 sm:px-8">
        <PosterStudioView />
      </div>
    </EmpireShell>
  );
}
