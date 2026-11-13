"use client";

import { useEffect, useState } from "react";
import { ControlGate } from "@/components/control/gate";
import { EmpireShell } from "@/components/shell";
import { IntelligenceDashboard } from "./IntelligenceDashboard";

export function IntelligenceShell() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ControlGate>
      <EmpireShell
        breadcrumb="RIOT Intelligence"
        search={{
          value: "",
          onChange: () => {},
          placeholder: "Search providers or models…",
        }}
      >
        {mounted ? (
          <IntelligenceDashboard />
        ) : (
          <div className="flex min-h-[60vh] items-center justify-center font-brush text-2xl text-[var(--pink)]">
            INITIALIZING RIOT INTELLIGENCE…
          </div>
        )}
      </EmpireShell>
    </ControlGate>
  );
}
