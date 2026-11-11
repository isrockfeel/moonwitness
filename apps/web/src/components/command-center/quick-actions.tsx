import type { QuickAction } from "@moonwitness/types";
import { QuickActionGrid } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export interface QuickActionsProps {
  actions: QuickAction[];
  onAction: (action: QuickAction) => void;
}

export function QuickActions({ actions, onAction }: QuickActionsProps) {
  return (
    <section aria-labelledby="cc-quick-heading" className="scroll-mt-24">
      <SectionHeading id="cc-quick-heading" title="QUICK" accent="ACTIONS" />
      <QuickActionGrid actions={actions} onAction={onAction} />
    </section>
  );
}
