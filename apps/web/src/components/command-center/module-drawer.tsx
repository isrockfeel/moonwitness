import type { Module, Project } from "@moonwitness/types";
import { ModuleGlyph } from "@moonwitness/ui";
import { ArrowRight } from "@moonwitness/ui/icons";

export interface ModuleDrawerProps {
  module: Module;
  projects: Project[];
  onQueue: (m: Module) => void;
  onClose: () => void;
}

export function ModuleDrawer({ module, projects, onQueue, onClose }: ModuleDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`${module.name} console`}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="zine-card-rough absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-md"
            style={{
              background: module.color,
              color: module.color === "#ffd21f" ? "#111" : "#fff",
            }}
          >
            <ModuleGlyph icon={module.icon} className="h-7 w-7" />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close module console"
            className="min-h-11 min-w-11 p-2 text-zinc-400 hover:text-[var(--pink)]"
          >
            ✕
          </button>
        </div>
        <h2 className="font-brush mt-4 text-3xl text-white">{module.name.toUpperCase()}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{module.description}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {module.stats.map((s) => (
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
              <span className="flex-1 min-w-0 truncate text-xs text-zinc-200">{p.title}</span>
              <span className="text-[10px] text-zinc-500">{p.progress}%</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onQueue(module)}
          className="btn-zine mt-6 w-full px-6 py-3.5 text-lg"
        >
          QUEUE NEW RUN <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-3 text-center text-[10px] text-zinc-600">
          Starts a workflow in the Automation Center immediately.
        </p>
      </div>
    </div>
  );
}
