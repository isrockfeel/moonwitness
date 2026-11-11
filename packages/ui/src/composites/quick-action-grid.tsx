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
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onAction(action)}
          className="btn-zine min-h-11 flex-col gap-2 px-4 py-3 text-sm"
        >
          <ModuleGlyph icon={action.icon} className="h-5 w-5" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
