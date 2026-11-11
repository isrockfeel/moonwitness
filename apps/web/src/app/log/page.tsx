"use client";

import { useState } from "react";
import { EmpireShell } from "@/components/shell";
import { MissionLog } from "@/components/command-center/log";
import { feedItems, initialAlerts, initialWorkflows } from "@/lib/data";
import { DistressedSticker } from "@moonwitness/ui";

export default function LogPage() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [activeWorkflows, setActiveWorkflows] = useState(initialWorkflows);

  const onDismissAlert = (id: string) => {
    setAlerts((list) => list.filter((a) => a.id !== id));
  };

  const onToggleWorkflow = (id: string) => {
    setActiveWorkflows((list) =>
      list.map((w) =>
        w.id === id ? { ...w, status: w.status === "Running" ? "Paused" : "Running" } : w,
      ),
    );
  };

  return (
    <EmpireShell
      breadcrumb="Mission Log // Intercepts"
      search={{
        value: "",
        onChange: () => {},
        placeholder: "Search logs, broadcasts, and intercepts…",
      }}
    >
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker
              variant="classified"
              text="TRANSMISSION INTERCEPTS"
              className="mb-2"
            />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              MISSION <span className="text-[var(--yellow)]">LOG & WORKFLOWS</span>
            </h1>
          </div>
          <DistressedSticker variant="barcode" code="LOG-DECK-99" />
        </div>

        <div className="max-w-2xl">
          <MissionLog
            feed={feedItems}
            alerts={alerts}
            workflows={activeWorkflows}
            onDismissAlert={onDismissAlert}
            onToggleWorkflow={onToggleWorkflow}
          />
        </div>
      </div>
    </EmpireShell>
  );
}
