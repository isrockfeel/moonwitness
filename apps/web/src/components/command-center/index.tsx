"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Module, QuickAction, Workflow } from "@moonwitness/types";
import { Star4 } from "@moonwitness/ui/icons";
import { EmpireShell } from "@/components/shell";
import {
  initialWorkflows,
  modules,
  projects,
  quickActions,
  universeStats,
  workspaceItems,
} from "@/lib/data";
import { CommandHero } from "./hero";
import { IdeasInMotion } from "./ideas";
import { ModuleDrawer } from "./module-drawer";
import { QuickActions } from "./quick-actions";
import { UniverseStatus } from "./status";
import { Workspace } from "./workspace";

export function CommandCenter() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [openModule, setOpenModule] = useState<Module | null>(null);
  const [, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = params.get("module");
    const m = modules.find((mod) => mod.id === id);
    if (m) setOpenModule(m);
  }, [params]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const q = query.trim().toLowerCase();
  const visibleWorkspace = useMemo(
    () => (q ? workspaceItems.filter((w) => w.title.toLowerCase().includes(q)) : workspaceItems),
    [q],
  );

  function onAction(action: QuickAction) {
    const m = modules.find((mod) => mod.id === action.moduleId);
    if (m) setOpenModule(m);
  }

  function queueRun(m: Module) {
    const wf: Workflow = {
      id: `wf-${Date.now()}`,
      name: `${m.name} Run`,
      detail: "Queued from module console…",
      status: "Running",
    };
    setWorkflows((ws) => [wf, ...ws]);
    setToast(`${m.name}: new run queued and started.`);
    setOpenModule(null);
  }

  return (
    <EmpireShell
      breadcrumb="Shadow Command Center"
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Search projects, stories, research, or people…",
      }}
    >
      <CommandHero />
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <UniverseStatus stats={universeStats} />
        <QuickActions actions={quickActions} onAction={onAction} />
        <IdeasInMotion />
        <Workspace items={visibleWorkspace} onOpenItem={(id) => setToast(`Opening ${id}…`)} />
      </div>

      {openModule && (
        <ModuleDrawer
          module={openModule}
          projects={projects}
          onQueue={queueRun}
          onClose={() => setOpenModule(null)}
        />
      )}

      {toast && (
        <div
          role="status"
          className="sticker sticker-yellow fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-5 py-2.5 font-brush text-sm"
        >
          {toast}
        </div>
      )}

      <Star4 className="pointer-events-none fixed bottom-24 right-6 hidden h-6 w-6 text-[var(--pink)] opacity-50 xl:block" />
    </EmpireShell>
  );
}
