import type { Collection } from "@moonwitness/types";
import { CollectionsGrid } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface CollectionsProps {
  collections: Collection[];
  onOpenCollection: (id: string) => void;
}

export function Collections({ collections, onOpenCollection }: CollectionsProps) {
  return (
    <section aria-labelledby="cc-collections" className="scroll-mt-24">
      <SectionHeading
        id="cc-collections"
        title="COLLECTIONS"
        accent="OVERVIEW"
        note={`${collections.length} live`}
      />
      <CollectionsGrid collections={collections} onOpenCollection={onOpenCollection} />
    </section>
  );
}
