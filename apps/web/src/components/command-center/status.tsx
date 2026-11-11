import type { UniverseStat } from "@moonwitness/types";
import { StatBlock, ZineBadge } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export function UniverseStatus({ stats }: { stats: UniverseStat[] }) {
  return (
    <section aria-labelledby="cc-status-heading" className="scroll-mt-24">
      <SectionHeading
        id="cc-status-heading"
        title="UNIVERSE"
        accent="STATUS"
        note="live snapshot"
      />
      <div className="mb-3 flex justify-end">
        <ZineBadge color="#3ddc84" dark>
          <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current align-middle" />
          LIVE
        </ZineBadge>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatBlock
            key={stat.label}
            value={stat.value}
            label={stat.label}
            tone={stat.tone}
            trend={stat.trend}
          />
        ))}
      </div>
    </section>
  );
}
