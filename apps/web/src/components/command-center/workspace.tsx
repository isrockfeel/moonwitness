import type { WorkspaceItem } from "@moonwitness/types";
import { WorkspaceList } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface WorkspaceProps {
  items: WorkspaceItem[];
  onOpenItem: (id: string) => void;
}

export function Workspace({ items, onOpenItem }: WorkspaceProps) {
  return (
    <section aria-labelledby="cc-workspace" className="scroll-mt-24">
      <SectionHeading
        id="cc-workspace"
        title="RECENT WORKSPACE"
        accent="ITEMS"
        note={`${items.length} items`}
      />
      <WorkspaceList items={items} onOpenItem={onOpenItem} />
    </section>
  );
}
