"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmpireShell } from "./shell";
import { ArrowRight, Bolt, Crown, Splatter, Star4 } from "@moonwitness/ui/icons";
import { Grain, Halftone, ModuleCard, ModuleGlyph } from "@moonwitness/ui";
import { artSrc } from "@/lib/art";
import {
  feedItems,
  initialAlerts,
  initialWorkflows,
  modules,
  projects,
  type Module,
  type Workflow,
} from "@/lib/data";

const orbitNodes = [
  { label: "IDEAS", x: 50, y: 6, module: "story-forge", color: "#2ea8ff" },
  { label: "CULTURES", x: 88, y: 28, module: "research-lab", color: "#2ea8ff" },
  { label: "WORLDS", x: 88, y: 72, module: "world-monitor", color: "#2ea8ff" },
  { label: "PUBLICATION", x: 50, y: 94, module: "publishing-hub", color: "#2ea8ff" },
  { label: "STORIES", x: 12, y: 72, module: "story-forge", color: "#2ea8ff" },
  { label: "PEOPLE", x: 12, y: 28, module: "research-lab", color: "#2ea8ff" },
];

function OrbitDiagram({ onOpen }: { onOpen: (m: Module) => void }) {
  return (
    <div className="zine-card-rough relative flex min-h-[320px] items-center justify-center overflow-hidden p-4">
      <Halftone className="absolute inset-0 opacity-40" />
      <svg viewBox="0 0 200 200" className="relative h-64 w-64 sm:h-72 sm:w-72" aria-hidden>
        <g className="orbit-ring">
          <circle
            cx="100"
            cy="100"
            r="82"
            fill="none"
            stroke="#2ea8ff"
            strokeWidth="0.7"
            strokeDasharray="4 5"
            opacity="0.6"
          />
          <circle cx="100" cy="18" r="2.5" fill="#ff2d78" />
          <circle cx="182" cy="100" r="2" fill="#ffd21f" />
        </g>
        <g className="orbit-ring-rev">
          <circle
            cx="100"
            cy="100"
            r="62"
            fill="none"
            stroke="#ff2d78"
            strokeWidth="0.7"
            strokeDasharray="3 4"
            opacity="0.6"
          />
          <circle cx="100" cy="38" r="2" fill="#2ea8ff" />
          <circle cx="38" cy="100" r="2.5" fill="#a855f7" />
        </g>
        <line x1="100" y1="100" x2="30" y2="170" stroke="#ffd21f" strokeWidth="1.2" />
        <path d="M30 170 L24 164 M30 170 L38 168" stroke="#ffd21f" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="34" fill="#12122a" stroke="#2ea8ff" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="34" fill="url(#moonGlow)" />
        <defs>
          <radialGradient id="moonGlow" cx="0.4" cy="0.35" r="0.9">
            <stop offset="0%" stopColor="#2ea8ff" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ff2d78" stopOpacity="0.35" />
          </radialGradient>
        </defs>
        <path
          d="M84 108 L82 94 L92 100 L100 88 L108 100 L118 94 L116 108 Z"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      {orbitNodes.map((n) => (
        <button
          key={n.label}
          onClick={() => {
            const m = modules.find((mod) => mod.id === n.module);
            if (m) onOpen(m);
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--blue)] bg-[var(--ink)] px-2.5 py-1 font-brush text-[10px] text-[var(--blue)] transition hover:scale-110 hover:border-[var(--pink)] hover:text-[var(--pink)]"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
        >
          {n.label}
        </button>
      ))}
      <span className="absolute bottom-3 right-3 rotate-[-4deg] font-hand text-lg leading-tight text-zinc-300">
        A brighter tomorrow
        <br />
        for a bolder humanity.
      </span>
    </div>
  );
}

export function MissionControl() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [openModule, setOpenModule] = useState<Module | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [alerts, setAlerts] = useState(initialAlerts);
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
  const visibleModules = useMemo(
    () =>
      q ? modules.filter((m) => `${m.name} ${m.description}`.toLowerCase().includes(q)) : modules,
    [q],
  );
  const visibleProjects = useMemo(
    () => (q ? projects.filter((p) => p.title.toLowerCase().includes(q)) : projects),
    [q],
  );
  const visibleWorkflows = useMemo(
    () =>
      q ? workflows.filter((w) => `${w.name} ${w.detail}`.toLowerCase().includes(q)) : workflows,
    [q, workflows],
  );
  const visibleFeed = useMemo(
    () => (q ? feedItems.filter((f) => f.text.toLowerCase().includes(q)) : feedItems),
    [q],
  );

  const leftModules = visibleModules.filter((m) =>
    ["story-forge", "poster-lab", "research-lab"].includes(m.id),
  );
  const rightModules = visibleModules.filter(
    (m) => !["story-forge", "poster-lab", "research-lab"].includes(m.id),
  );

  function toggleWorkflow(id: string) {
    setWorkflows((ws) =>
      ws.map((w) =>
        w.id === id ? { ...w, status: w.status === "Running" ? "Paused" : "Running" } : w,
      ),
    );
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
      breadcrumb="Mission Control"
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Search projects, stories, research, or people…",
      }}
    >
      {/* HERO BANNER */}
      <div className="relative overflow-hidden border-b-2 border-[var(--line)]">
        <Grain />
        <Image
          src={artSrc("city-shadow")}
          alt=""
          fill
          priority
          className="object-cover object-[70%_30%]"
          sizes="(max-width: 1024px) 100vw, 80vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,11,16,0.92)] via-[rgba(11,11,16,0.55)] to-transparent" />
        <Splatter className="absolute -left-6 top-6 h-32 w-32 text-[var(--pink)] opacity-60" />
        <div className="relative z-10 px-4 py-10 sm:px-8">
          <div className="relative inline-block">
            <h1 className="font-brush text-4xl leading-none text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] sm:text-6xl">
              MISSION <span className="text-[var(--pink)]">CONTROL</span>
            </h1>
            <Crown className="absolute -top-5 right-0 h-6 w-9 -rotate-12 text-[var(--yellow)]" />
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">
            Coordinate stories, research, world signals, AI workflows, and publishing operations.
            Different people. Same sky. A brighter tomorrow for a bolder humanity.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-brush text-sm text-[var(--yellow)]">
            {["PLAN", "CREATE", "RESEARCH", "VERIFY", "PUBLISH", "AMPLIFY"].map((w, i) => (
              <span key={w} className="flex items-center gap-4">
                {i > 0 && <span className="text-zinc-500">//</span>}
                <span className={i === 2 ? "brush-underline text-white" : ""}>{w}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4 py-6 sm:px-8">
        {/* MODULES + ORBIT */}
        <section
          aria-label="Modules"
          className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,1.1fr)_minmax(0,1fr)]"
        >
          <div className="space-y-4">
            {leftModules.map((m) => (
              <ModuleCard key={m.id} module={m} onOpen={setOpenModule} />
            ))}
            {leftModules.length === 0 && (
              <p className="p-4 text-sm text-zinc-500">No modules match “{query}”.</p>
            )}
          </div>
          <OrbitDiagram onOpen={setOpenModule} />
          <div className="space-y-4">
            {rightModules.map((m) => (
              <ModuleCard key={m.id} module={m} onOpen={setOpenModule} />
            ))}
          </div>
        </section>

        {/* BOTTOM GRID */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* PROJECT UNIVERSE */}
          <section aria-labelledby="pu-heading" className="zine-card-rough p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="pu-heading" className="flex items-center gap-2 font-brush text-lg text-white">
                PROJECT UNIVERSE <Crown className="h-4 w-6 text-[var(--yellow)]" />
              </h2>
              <a href="/dock" className="text-xs text-[var(--blue)] hover:underline">
                View All →
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
              {visibleProjects.map((p) => (
                <a
                  key={p.id}
                  href={`/dock?q=${encodeURIComponent(p.title)}`}
                  className="group overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel-2)]"
                >
                  <div className="relative h-20 overflow-hidden">
                    <Image
                      src={artSrc(p.image)}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      style={{ objectPosition: p.imagePosition }}
                      sizes="160px"
                    />
                    <span className="absolute bottom-1 left-1 font-brush text-[11px] leading-tight text-white drop-shadow-[1px_1px_0_#000]">
                      {p.title.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-2">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{ background: `${p.color}22`, color: p.color }}
                    >
                      {p.status}
                    </span>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--line)]">
                      <div
                        className="h-full"
                        style={{ width: `${p.progress}%`, background: p.color }}
                      />
                    </div>
                    <div className="mt-1 text-right text-[9px] text-zinc-500">{p.progress}%</div>
                  </div>
                </a>
              ))}
              {visibleProjects.length === 0 && (
                <p className="col-span-full py-4 text-sm text-zinc-500">No projects match.</p>
              )}
            </div>
          </section>

          {/* ACTIVE WORKFLOWS */}
          <section aria-labelledby="wf-heading" className="zine-card-rough p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="wf-heading" className="flex items-center gap-2 font-brush text-lg text-white">
                ACTIVE WORKFLOWS <Crown className="h-4 w-6 text-[var(--yellow)]" />
              </h2>
              <span className="text-[10px] text-zinc-500">
                {workflows.filter((w) => w.status === "Running").length} running
              </span>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {visibleWorkflows.map((w) => (
                <div key={w.id} className="flex items-center gap-3 py-2.5">
                  <Bolt
                    className={`h-4 w-3 shrink-0 ${w.status === "Running" ? "text-[var(--green)]" : w.status === "Queued" ? "text-[var(--blue)]" : "text-[var(--yellow)]"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-zinc-200">{w.name}</p>
                    <p className="truncate text-[10px] text-zinc-500">
                      {w.status === "Paused" ? "Paused by operator" : w.detail}
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 text-[10px] ${w.status === "Running" ? "text-[var(--green)]" : w.status === "Queued" ? "text-[var(--blue)]" : "text-[var(--yellow)]"}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${w.status === "Running" ? "pulse-dot" : ""} bg-current`}
                    />
                    {w.status}
                  </span>
                  <button
                    onClick={() => toggleWorkflow(w.id)}
                    aria-label={w.status === "Running" ? `Pause ${w.name}` : `Resume ${w.name}`}
                    className="rounded border border-[var(--line)] px-2 py-1 text-[10px] text-zinc-300 hover:border-[var(--pink)] hover:text-[var(--pink)]"
                  >
                    {w.status === "Running" ? "Pause" : "Run"}
                  </button>
                </div>
              ))}
              {visibleWorkflows.length === 0 && (
                <p className="py-4 text-sm text-zinc-500">No workflows match.</p>
              )}
            </div>
          </section>

          {/* FEED + ALERTS */}
          <div className="space-y-4">
            <section aria-labelledby="feed-heading" className="zine-card-rough p-4">
              <h2
                id="feed-heading"
                className="mb-3 flex items-center gap-2 font-brush text-lg text-white"
              >
                COMMAND FEED <Crown className="h-4 w-6 text-[var(--yellow)]" />
              </h2>
              <div className="divide-y divide-[var(--line)]">
                {visibleFeed.map((f) => (
                  <div key={f.id} className="flex items-start gap-2 py-2">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: f.color }}
                    />
                    <p className="flex-1 text-xs leading-snug text-zinc-300">{f.text}</p>
                    <span className="shrink-0 text-[10px] text-zinc-600">{f.ago}</span>
                  </div>
                ))}
                {visibleFeed.length === 0 && (
                  <p className="py-4 text-sm text-zinc-500">No feed items match.</p>
                )}
              </div>
            </section>

            <section aria-labelledby="alerts-heading" className="zine-card-rough p-4">
              <h2
                id="alerts-heading"
                className="mb-3 flex items-center gap-2 font-brush text-lg text-white"
              >
                MISSION ALERTS <Crown className="h-4 w-6 text-[var(--yellow)]" />
              </h2>
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
                  >
                    <span
                      className={`font-brush text-sm ${a.level === "high" ? "text-[var(--red)]" : a.level === "medium" ? "text-[var(--yellow)]" : "text-[var(--blue)]"}`}
                    >
                      !
                    </span>
                    <p className="flex-1 text-xs text-zinc-300">{a.text}</p>
                    <span className="text-[10px] text-zinc-600">{a.ago}</span>
                    <button
                      onClick={() => {
                        setAlerts((list) => list.filter((x) => x.id !== a.id));
                        setToast("Alert dismissed.");
                      }}
                      aria-label={`Dismiss alert: ${a.text}`}
                      className="px-1 text-zinc-500 hover:text-[var(--pink)]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="py-2 text-xs text-zinc-500">All clear. The sky is quiet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* MODULE DRAWER */}
      {openModule && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`${openModule.name} console`}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpenModule(null)}
          />
          <div className="zine-card-rough absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto p-6">
            <div className="flex items-start justify-between">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-md"
                style={{
                  background: openModule.color,
                  color: openModule.color === "#ffd21f" ? "#111" : "#fff",
                }}
              >
                <ModuleGlyph icon={openModule.icon} className="h-7 w-7" />
              </span>
              <button
                onClick={() => setOpenModule(null)}
                aria-label="Close module console"
                className="p-2 text-zinc-400 hover:text-[var(--pink)]"
              >
                ✕
              </button>
            </div>
            <h2 className="font-brush mt-4 text-3xl text-white">{openModule.name.toUpperCase()}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{openModule.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {openModule.stats.map((s) => (
                <div
                  key={s.label}
                  className="border border-[var(--line)] bg-[var(--panel-2)] p-3 text-center"
                >
                  <div className="font-brush text-2xl" style={{ color: s.color }}>
                    {s.value}
                  </div>
                  <div className="mt-1 text-[10px] tracking-wider text-zinc-500">
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            <h3 className="font-brush mt-6 text-sm text-[var(--yellow)]">CONNECTED PROJECTS</h3>
            <div className="mt-2 space-y-2">
              {projects.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border border-[var(--line)] px-3 py-2"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  <span className="flex-1 text-xs text-zinc-200">{p.title}</span>
                  <span className="text-[10px] text-zinc-500">{p.progress}%</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => queueRun(openModule)}
              className="btn-zine mt-6 w-full px-6 py-3.5 text-lg"
            >
              QUEUE NEW RUN <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-3 text-center text-[10px] text-zinc-600">
              Starts a workflow in the Automation Center immediately.
            </p>
          </div>
        </div>
      )}

      {/* TOAST */}
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
