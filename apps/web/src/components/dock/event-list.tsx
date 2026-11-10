"use client";

import type { TimelineEvent } from "@moonwitness/types";
import { Crown } from "@moonwitness/ui/icons";
import { EventCard } from "@moonwitness/ui";

interface EventListProps {
  events: TimelineEvent[];
  total: number;
  view: "grid" | "list";
  selectedId: string | null;
  query: string;
  onOpen: (id: string) => void;
  onReset: () => void;
}

export function EventList({ events, total, view, selectedId, query, onOpen, onReset }: EventListProps) {
  return (
    <section aria-label="Events">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-brush text-xl text-white">
          <Crown className="h-5 w-8 text-[var(--yellow)]" /> EVENTS
          <span className="ml-2 hidden text-[10px] font-normal tracking-widest text-zinc-500 sm:inline">
            KEY MOMENTS, PROJECTS, AND SIGNALS FROM ACROSS THE EMPIRE.
          </span>
        </h2>
        <span className="text-[11px] text-zinc-500">
          Showing {events.length} of {total} events
        </span>
      </div>
      {events.length === 0 ? (
        <div className="zine-card-rough p-10 text-center">
          <p className="font-brush text-xl text-zinc-400">NO SIGNALS FOUND.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Nothing matches “{query}” in this era. Try another frequency.
          </p>
          <button onClick={onReset} className="btn-zine btn-blue mt-4 px-5 py-2 text-sm">
            RESET FILTERS
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              selected={selectedId === ev.id}
              list={false}
              onOpen={() => onOpen(ev.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              selected={selectedId === ev.id}
              list
              onOpen={() => onOpen(ev.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
