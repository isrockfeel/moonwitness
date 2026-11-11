import { ArrowRight, Crown } from "../icons";
import { ModuleGlyph } from "./module-glyph";

export interface ModuleStat {
  label: string;
  value: string | number;
  color: string;
}

export interface ModuleItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  stats: ModuleStat[];
}

export interface ModuleCardProps<T extends ModuleItem = ModuleItem> {
  module: T;
  onOpen: (m: T) => void;
}

export function ModuleCard<T extends ModuleItem>({ module, onOpen }: ModuleCardProps<T>) {
  return (
    <button
      onClick={() => onOpen(module)}
      className="zine-card-rough group flex w-full items-center gap-4 p-4 text-left transition-transform hover:-translate-y-0.5"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
        style={{ background: module.color, color: module.color === "#ffd21f" ? "#111" : "#fff" }}
      >
        <ModuleGlyph icon={module.icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-brush text-lg leading-tight text-white">
            {module.name.toUpperCase()}
          </span>
          <Crown className="h-3.5 w-5 text-[var(--yellow)]" />
        </span>
        <span className="mt-0.5 block truncate text-xs text-zinc-400">{module.description}</span>
        <span className="mt-1.5 flex flex-wrap gap-x-3 text-[11px]">
          {module.stats.map((s) => (
            <span key={s.label} className="flex items-center gap-1 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              <span style={{ color: s.color }}>{s.value}</span> {s.label}
            </span>
          ))}
        </span>
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--line)] text-zinc-400 transition-colors group-hover:border-[var(--pink)] group-hover:text-[var(--pink)]">
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}
