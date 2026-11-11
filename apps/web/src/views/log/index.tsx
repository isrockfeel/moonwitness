"use client";

import { MissionLog } from "@/components/command-center/log";
import { initialAlerts, feedItems, initialWorkflows } from "@/lib/data";

export function LogView() {
  return (
    <div className="space-y-6">
      <MissionLog
        feed={feedItems}
        alerts={initialAlerts}
        workflows={initialWorkflows}
        onDismissAlert={() => {}}
        onToggleWorkflow={() => {}}
      />
    </div>
  );
}
