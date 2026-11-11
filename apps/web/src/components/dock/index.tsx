"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { EraId } from "@moonwitness/types";
import { EmpireShell } from "../shell";
import { Star4 } from "@moonwitness/ui/icons";
import { EraBand } from "@moonwitness/ui";
import { timelineEvents, eras } from "@/lib/data";
import { DockHero } from "./hero";
import { FilterBar, type SortKey } from "./filter-bar";
import { EventList } from "./event-list";
import { EventDetailPanel } from "./event-detail-panel";

export function Dock() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [era, setEra] = useState<EraId | "all">((params.get("era") ?? "all") as EraId | "all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = params.get("event");
    return timelineEvents.some((e) => e.id === id) ? id : "moonwitness-born";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    let list = timelineEvents.filter((e) => era === "all" || e.era === era);
    if (q)
      list = list.filter((e) =>
        `${e.title} ${e.excerpt} ${e.body} ${e.tags.join(" ")} ${e.location}`
          .toLowerCase()
          .includes(q),
      );
    return [...list].sort((a, b) =>
      sort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    );
  }, [era, q, sort]);

  const selected = timelineEvents.find((e) => e.id === selectedId) ?? null;
  const selectedEra = selected ? eras.find((e) => e.id === selected.era) : undefined;
  const relatedEvents = selected
    ? timelineEvents.filter((e) => selected.related.includes(e.id))
    : [];

  function select(id: string) {
    setSelectedId(id);
    setDrawerOpen(true);
  }

  function resetFilters() {
    setQuery("");
    setEra("all");
  }

  return (
    <EmpireShell
      breadcrumb="Dock / Lighthouse"
      search={{ value: query, onChange: setQuery, placeholder: "Search timeline events…" }}
    >
      <DockHero visibleCount={visible.length} />

      <div className="space-y-5 px-4 py-6 sm:px-8">
        <FilterBar
          era={era}
          onEraChange={setEra}
          sort={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
        />

        <EraBand eras={eras} active={era} onSelect={setEra} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <EventList
            events={visible}
            total={timelineEvents.length}
            view={view}
            selectedId={selectedId}
            query={query}
            onOpen={select}
            onReset={resetFilters}
          />

          {selected && selectedEra && (
            <EventDetailPanel
              variant="aside"
              event={selected}
              era={selectedEra}
              relatedEvents={relatedEvents}
              shareUrl={`${origin}/dock?event=${selected.id}`}
              onRelated={select}
            />
          )}
        </div>
      </div>

      {drawerOpen && selected && selectedEra && (
        <EventDetailPanel
          variant="drawer"
          event={selected}
          era={selectedEra}
          relatedEvents={relatedEvents}
          shareUrl={`${origin}/dock?event=${selected.id}`}
          onRelated={select}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      <Star4 className="pointer-events-none fixed bottom-24 right-6 hidden h-6 w-6 text-[var(--yellow)] opacity-50 xl:block" />
    </EmpireShell>
  );
}
