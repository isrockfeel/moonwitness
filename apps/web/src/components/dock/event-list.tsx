"use client";

import type { TimelineEvent } from "@moonwitness/types";
import { Crown, BarbedWire } from "@moonwitness/ui/icons";
import { EventCard, DistressedSticker, TactileTape, Staple } from "@moonwitness/ui";

interface EventListProps {
  events: TimelineEvent[];
  total: number;
  view: "grid" | "list";
  selectedId: string | null;
  query: string;
  onOpen: (id: string) => void;
  onReset: () => void;
}

export function EventList({
  events,
  total,
  view,
  selectedId,
  query,
  onOpen,
  onReset,
}: EventListProps) {
  return (
    <section aria-label="Events" className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-[var(--line)] pb-3">
        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 font-brush text-2xl text-white tracking-wide">
            <Crown className="h-5 w-8 text-[var(--yellow)] -rotate-6" /> MURDER BOARD // EVIDENCE LOG
          </h2>
          <DistressedSticker variant="classified" className="text-[9px] -rotate-2" text="CRIME-SCENE" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="bg-black/60 border border-[var(--line)] px-2 py-0.5 text-zinc-400">
            RECORDED: <strong className="text-[var(--pink)]">{events.length}</strong> / {total}
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="zine-card-rough relative p-12 text-center overflow-hidden border-2 border-dashed border-[var(--line)]">
          <TactileTape variant="black" className="-top-3 left-10 rotate-3" />
          <TactileTape variant="yellow" className="-bottom-3 right-10 -rotate-2" />
          <p className="font-brush text-3xl text-zinc-400">NO SIGNALS FOUND ON PINS.</p>
          <p className="mt-2 text-sm text-zinc-500 font-mono">
            Nothing matches “{query}” across the evidence web. Try another frequency or clear tags.
          </p>
          <button onClick={onReset} className="btn-zine btn-blue mt-5 px-6 py-2.5 text-sm font-bold tracking-wider">
            RESET INVESTIGATION
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="relative">
          {/* Subtle string/wire background aesthetic */}
          <div className="pointer-events-none absolute -top-3 left-4 right-4 flex justify-between opacity-30 text-[var(--pink)] overflow-hidden">
            <BarbedWire className="h-3 w-64" />
            <BarbedWire className="h-3 w-64 hidden sm:block" />
            <BarbedWire className="h-3 w-64 hidden xl:block" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3 pt-2">
            {events.map((ev, index) => (
              <div key={ev.id} className="relative group">
                {/* Tactile hardware on alternating cards for detective board look */}
                {index % 3 === 0 && <Staple className="-top-2 left-6 z-20" />}
                {index % 3 === 1 && <TactileTape variant="yellow" className="-top-3 right-6 -rotate-3 z-20 scale-90" />}
                {index % 3 === 2 && <TactileTape variant="black" className="-top-3 left-8 rotate-2 z-20 scale-90" />}
                
                <EventCard
                  event={ev}
                  selected={selectedId === ev.id}
                  list={false}
                  onOpen={() => onOpen(ev.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="relative">
              <EventCard
                event={ev}
                selected={selectedId === ev.id}
                list
                onOpen={() => onOpen(ev.id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
