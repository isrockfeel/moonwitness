import type { PipelineCard, PipelineColumn } from "@moonwitness/types";
import { KanbanColumn } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface PipelineProps {
  columns: PipelineColumn[];
  onOpenCard: (card: PipelineCard) => void;
}

export function Pipeline({ columns, onOpenCard }: PipelineProps) {
  return (
    <section aria-labelledby="cc-pipeline-heading" className="scroll-mt-24">
      <SectionHeading
        id="cc-pipeline-heading"
        title="EDITORIAL"
        accent="PIPELINE"
        note="click a card, no dragging"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <KanbanColumn key={column.stage} column={column} onOpenItem={onOpenCard} />
        ))}
      </div>
    </section>
  );
}
