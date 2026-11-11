import type { StatTone, UniverseStat } from "@moonwitness/types";
import { cn } from "../cn";
import { ZineCard } from "../primitives/zine-card";

const TONE_VAR: Record<StatTone, string> = {
  pink: "var(--pink)",
  blue: "var(--blue)",
  yellow: "var(--yellow)",
  green: "var(--green)",
};

export function StatBlock({ stat }: { stat: UniverseStat }) {
  return (
    <ZineCard className="relative overflow-hidden p-4">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: TONE_VAR[stat.tone] }}
      />
      <div
        className="font-brush text-3xl leading-none sm:text-4xl"
        style={{ color: TONE_VAR[stat.tone] }}
      >
        {stat.value}
      </div>
      <div className={cn("mt-2 text-[10px] tracking-widest text-zinc-500")}>{stat.label}</div>
      {stat.trend && <div className="mt-1 text-[11px] text-zinc-400">{stat.trend}</div>}
    </ZineCard>
  );
}
