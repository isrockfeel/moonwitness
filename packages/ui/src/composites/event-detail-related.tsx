"use client";

import type { TimelineEvent } from "@moonwitness/types";
import { kindColors } from "./kind-colors";

export interface EventDetailRelatedProps {
  relatedEvents: TimelineEvent[];
  onRelated: (id: string) => void;
}

export function EventDetailRelated({ relatedEvents, onRelated }: EventDetailRelatedProps) {
  return (
    <>
      <h3 className="font-brush mt-5 text-sm text-[var(--yellow)]">RELATED EVENTS</h3>
      <div className="mt-2 space-y-1.5">
        {relatedEvents.map((r) => (
          <button
            key={r.id}
            onClick={() => onRelated(r.id)}
            className="flex w-full items-center gap-2 border border-[var(--line)] px-3 py-2 text-left hover:border-[var(--pink)]"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: kindColors[r.kind] }}
            />
            <span className="text-[10px] text-zinc-500">{r.date}</span>
            <span className="flex-1 truncate text-xs text-zinc-200">{r.title}</span>
            <span className="text-[10px]" style={{ color: kindColors[r.kind] }}>
              ({r.kind})
            </span>
          </button>
        ))}
        {relatedEvents.length === 0 && (
          <p className="text-xs text-zinc-500">No related signals yet.</p>
        )}
      </div>
    </>
  );
}
