"use client";

import { ModuleGlyph } from "./module-glyph";

export interface QuickActionItem {
  id: string;
  label: string;
  icon: string;
}

export interface QuickActionGridProps<T extends QuickActionItem = QuickActionItem> {
  actions: T[];
  onAction: (action: T) => void;
}

export function QuickActionGrid<T extends QuickActionItem>({
  actions,
  onAction,
}: QuickActionGridProps<T>) {
  const [primary, ...secondary] = actions;

  return (
    <div className="space-y-3">
      {primary && (
        <button
          key={primary.id}
          type="button"
          onClick={() => onAction(primary)}
          className="btn-zine flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <span className="flex items-center gap-3">
            <ModuleGlyph icon={primary.icon} className="h-5 w-5" />
            {primary.label}
          </span>
          <span aria-hidden="true">→</span>
        </button>
      )}
      <div className="grid grid-cols-3 gap-2">
        {secondary.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action)}
            className="flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-2 border border-[var(--line)] bg-[var(--panel-2)] px-2 py-2 text-center text-xs font-bold text-white transition duration-150 hover:-translate-y-0.5 hover:border-[var(--yellow)] hover:text-[var(--yellow)] active:translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--yellow)]"
          >
            <ModuleGlyph icon={action.icon} className="h-5 w-5 shrink-0" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
