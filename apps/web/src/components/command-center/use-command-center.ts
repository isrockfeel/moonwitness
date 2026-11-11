"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  Collection,
  FeedItem,
  MissionAlert,
  Module,
  PipelineCard,
  PipelineColumn,
  Project,
  QuickAction,
  WorkspaceItem,
  Workflow,
} from "@moonwitness/types";
import {
  collections,
  feedItems,
  initialAlerts,
  initialWorkflows,
  modules,
  pipeline,
  projects,
  workspaceItems,
} from "@/lib/data";
import type { ItemDrawerDetail } from "./item-drawer";

export interface CommandCenterState {
  query: string;
  setQuery: (v: string) => void;
  openModule: Module | null;
  detail: ItemDrawerDetail | null;
  toast: string | null;
  selectedCity: string | null;
  setSelectedCity: (id: string) => void;
  closeOverlays: () => void;
  alerts: MissionAlert[];
  visible: {
    workspace: WorkspaceItem[];
    pipeline: PipelineColumn[];
    collections: Collection[];
    projects: Project[];
    feed: FeedItem[];
    workflows: Workflow[];
  };
  onAction: (a: QuickAction) => void;
  onOpenModule: (m: Module) => void;
  onOpenWorkspaceItem: (id: string) => void;
  onOpenCard: (card: PipelineCard) => void;
  onOpenCollection: (id: string) => void;
  onQueue: (m: Module) => void;
  onDismissAlert: (id: string) => void;
  onToggleWorkflow: (id: string) => void;
  previousFocus: HTMLElement | null;
  setPreviousFocus: (el: HTMLElement | null) => void;
}

export function useCommandCenter(): CommandCenterState {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [openModule, setOpenModule] = useState<Module | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [alerts, setAlerts] = useState<MissionAlert[]>(initialAlerts);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDrawerDetail | null>(null);
  const [previousFocus, setPreviousFocus] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const m = modules.find((mod) => mod.id === params.get("module"));
    if (m) setOpenModule(m);
  }, [params]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const closeOverlays = useCallback(() => {
    setOpenModule(null);
    setDetail(null);
    if (previousFocus) {
      previousFocus.focus();
      setPreviousFocus(null);
    }
  }, [previousFocus]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeOverlays();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOverlays]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => ({
      workspace: q
        ? workspaceItems.filter((w) => w.title.toLowerCase().includes(q))
        : workspaceItems,
      pipeline: q
        ? pipeline.map((c) => ({
            ...c,
            items: c.items.filter((i) => i.title.toLowerCase().includes(q)),
          }))
        : pipeline,
      collections: q ? collections.filter((c) => c.name.toLowerCase().includes(q)) : collections,
      projects: q ? projects.filter((p) => p.title.toLowerCase().includes(q)) : projects,
      feed: q ? feedItems.filter((f) => f.text.toLowerCase().includes(q)) : feedItems,
      workflows: q
        ? workflows.filter((w) => `${w.name} ${w.detail}`.toLowerCase().includes(q))
        : workflows,
    }),
    [q, workflows],
  );

  function onAction(a: QuickAction) {
    const m = modules.find((mod) => mod.id === a.moduleId);
    if (m) {
      setPreviousFocus(document.activeElement as HTMLElement);
      setOpenModule(m);
    }
  }

  function onOpenModule(m: Module) {
    setPreviousFocus(document.activeElement as HTMLElement);
    setOpenModule(m);
  }

  function onOpenWorkspaceItem(id: string) {
    const item = workspaceItems.find((w) => w.id === id);
    if (!item) return;
    setPreviousFocus(document.activeElement as HTMLElement);
    setDetail({
      title: item.title,
      subtitle: item.kind,
      rows: [
        { label: "STATUS", value: item.status },
        { label: "UPDATED", value: item.updatedAt },
      ],
    });
  }

  function onOpenCard(card: PipelineCard) {
    setPreviousFocus(document.activeElement as HTMLElement);
    setDetail({
      title: card.title,
      subtitle: card.type,
      art: card.thumb,
      rows: [{ label: "TYPE", value: card.type }],
    });
  }

  function onOpenCollection(id: string) {
    const c = collections.find((x) => x.id === id);
    if (!c) return;
    setPreviousFocus(document.activeElement as HTMLElement);
    setDetail({
      title: c.name,
      subtitle: "COLLECTION",
      art: c.cover,
      rows: [{ label: "EPISODES", value: String(c.episodes) }],
    });
  }

  function onQueue(m: Module) {
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

  function onDismissAlert(id: string) {
    setAlerts((list) => list.filter((a) => a.id !== id));
    setToast("Alert dismissed.");
  }

  function onToggleWorkflow(id: string) {
    setWorkflows((ws) =>
      ws.map((w) =>
        w.id === id ? { ...w, status: w.status === "Running" ? "Paused" : "Running" } : w,
      ),
    );
  }

  return {
    query,
    setQuery,
    openModule,
    detail,
    toast,
    selectedCity,
    setSelectedCity,
    closeOverlays,
    alerts,
    visible,
    onAction,
    onOpenModule,
    onOpenWorkspaceItem,
    onOpenCard,
    onOpenCollection,
    onQueue,
    onDismissAlert,
    onToggleWorkflow,
    previousFocus,
    setPreviousFocus,
  };
}
