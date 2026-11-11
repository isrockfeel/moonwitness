"use client";

import { ZineImage } from "../primitives/zine-image";
import { defaultKindColors } from "./kind-colors";

export interface KanbanCard {
  id: string;
  title: string;
  type: string;
  thumb: string;
}

export interface KanbanColumnData<C extends KanbanCard = KanbanCard> {
  stage: string;
  count: number;
  more: number;
  items: C[];
  color?: string;
}

export interface KanbanColumnProps<C extends KanbanCard = KanbanCard> {
  column: KanbanColumnData<C>;
  onOpenItem: (card: C) => void;
}

const DEFAULT_STAGE_COLOR: Record<string, string> = {
  DRAFT: "#9ca3af",
  "IN REVIEW": "#ff2d78",
  APPROVED: "#ffd21f",
  PUBLISHED: "#3b82f6",
};

export const STAGE_COLOR = DEFAULT_STAGE_COLOR;

export function KanbanColumn<C extends KanbanCard>({ column, onOpenItem }: KanbanColumnProps<C>) {
  const color = column.color ?? DEFAULT_STAGE_COLOR[column.stage] ?? "#9ca3af";
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
                style={{ color: defaultKindColors[card.type] ?? "#9ca3af" }}
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
