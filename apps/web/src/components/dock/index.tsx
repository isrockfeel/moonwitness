"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { EraId } from "@moonwitness/types";
import { EmpireShell } from "../shell";
import { Star4 } from "@moonwitness/ui/icons";
import { EraBand } from "@moonwitness/ui";
import { DockHero } from "./hero";
import { FilterBar, type SortKey } from "./filter-bar";
import { EventList } from "./event-list";
import { EventDetailPanel } from "./event-detail-panel";
import { useTimelineEvents, useTimelineEras } from "@/lib/api/timeline";

export function Dock() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [era, setEra] = useState<EraId | "all">((params.get("era") ?? "all") as EraId | "all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = params.get("event");
    return id; // will be validated after data loads
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [origin, setOrigin] = useState("");

  const { data: eventsData, isLoading: eventsLoading } = useTimelineEvents({
    era: era === "all" ? undefined : era,
    limit: 100,
  });
  const { data: erasData, isLoading: erasLoading } = useTimelineEras();

  useEffect(() => setOrigin(window.location.origin), []);

  const timelineEvents = useMemo(() => eventsData?.data ?? [], [eventsData?.data]);
  const eras = erasData?.data ?? [];

  useEffect(() => {
    const id = params.get("event");
    if (id && timelineEvents.some((e) => e.id === id)) {
      setSelectedId(id);
    } else if (timelineEvents.length > 0) {
      const first = timelineEvents[0];
      if (first) setSelectedId(first.id);
    }
  }, [timelineEvents, params]);

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
  }, [era, q, sort, timelineEvents]);

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

  if (eventsLoading || erasLoading) {
    return (
      <EmpireShell
        breadcrumb="Dock / Lighthouse"
        search={{ value: query, onChange: setQuery, placeholder: "Search timeline events…" }}
      >
        <div className="flex h-[60vh] items-center justify-center font-brush text-xl text-[var(--pink)]">
          LOADING THE DOCK…
        </div>
      </EmpireShell>
    );
  }

  return (
    <EmpireShell
      breadcrumb="Dock / Lighthouse"
      search={{ value: query, onChange: setQuery, placeholder: "Search timeline events…" }}
    >
      <DockHero visibleCount={visible.length} total={eventsData?.total ?? timelineEvents.length} />

      <div className="space-y-5 px-4 py-6 sm:px-8">
        <FilterBar
          era={era}
          onEraChange={setEra}
          sort={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
        />

        <EraBand eras={eras} active={era} onSelect={(e) => setEra(e as EraId | "all")} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <EventList
            events={visible}
            total={eventsData?.total ?? timelineEvents.length}
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
