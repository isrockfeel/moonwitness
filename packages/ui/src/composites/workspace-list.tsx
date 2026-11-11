"use client";

import { ZineCard } from "../primitives/zine-card";
import { StatusBadge } from "./status-badge";
import { defaultKindColors } from "./kind-colors";

export interface WorkspaceItem {
  id: string;
  title: string;
  kind: string;
  updatedAt: string;
  status: string;
}

export interface WorkspaceListProps<T extends WorkspaceItem = WorkspaceItem> {
  items: T[];
  onOpenItem: (id: string) => void;
}

export function WorkspaceList<T extends WorkspaceItem>({
  items,
  onOpenItem,
}: WorkspaceListProps<T>) {
  return (
    <ZineCard className="divide-y-2 divide-[var(--line)] overflow-hidden">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpenItem(item.id)}
          className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--panel-2)] focus-visible:bg-[var(--panel-2)]"
        >
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: defaultKindColors[item.kind] ?? "#9ca3af" }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-zinc-200">{item.title}</span>
            <span className="mt-0.5 block text-[10px] tracking-widest text-zinc-500">
              {item.kind} · {item.updatedAt}
            </span>
          </span>
          <StatusBadge status={item.status} />
        </button>
      ))}
    </ZineCard>
  );
}
