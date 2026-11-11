"use client";

import { Collections as CommandCenterCollections } from "@/components/command-center/collections";
import { collections } from "@/lib/data";

export function CollectionsView() {
  return (
    <div className="space-y-6">
      <CommandCenterCollections collections={collections} onOpenCollection={() => {}} />
    </div>
  );
}
