"use client";

import type { PipelineCard, PipelineColumn, PipelineStage } from "@moonwitness/types";
import { ZineImage } from "../primitives/zine-image";
import { kindColors } from "./kind-colors";

/** Border berwarna per stage, sama seperti referensi 06-shadow-command-center.png. */
export const STAGE_COLOR: Record<PipelineStage, string> = {
  DRAFT: "#a855f7",
  "IN REVIEW": "#ffd21f",
  APPROVED: "#3ddc84",
  PUBLISHED: "#ff2d78",
};

export interface KanbanColumnProps {
  column: PipelineColumn;
  onOpenItem: (card: PipelineCard) => void;
}

export function KanbanColumn({ column, onOpenItem }: KanbanColumnProps) {
  const color = STAGE_COLOR[column.stage];
  return (
    <section
      aria-label={`${column.stage}, ${column.count} item`}
      className="flex min-w-0 flex-col gap-3 border-t-4 bg-[var(--panel)] p-3"
      style={{ borderTopColor: color }}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-brush text-base leading-none" style={{ color }}>
          {column.stage}
        </h3>
        <span className="text-[11px] text-zinc-500">{column.count}</span>
      </header>
      <div className="flex flex-col gap-2">
        {column.items.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onOpenItem(card)}
            className="zine-card flex min-h-11 w-full items-center gap-3 p-2 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm">
              <ZineImage art={card.thumb} alt="" sizes="64px" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-zinc-200">{card.title}</span>
              <span
                className="mt-1 block text-[10px] tracking-widest"
                style={{ color: kindColors[card.type] }}
              >
                {card.type}
              </span>
            </span>
          </button>
        ))}
      </div>
      {column.more > 0 && (
        <p className="text-center text-[10px] tracking-widest text-zinc-600">+{column.more} MORE</p>
      )}
    </section>
  );
}
