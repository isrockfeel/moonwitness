"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { EraId } from "@moonwitness/types";
import { EmpireShell } from "./empire-shell";
import { Crown, Splatter, Star4 } from "@moonwitness/ui/icons";
import { EraBand, EventCard, EventDetail, Grain } from "@moonwitness/ui";
import { timelineEvents, eras } from "@/lib/data";

export function Dock() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [era, setEra] = useState<EraId | "all">((params.get("era") ?? "all") as EraId | "all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
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

  return (
    <EmpireShell
      active="dock"
      breadcrumb="Dock / Lighthouse"
      search={{ value: query, onChange: setQuery, placeholder: "Search timeline events…" }}
    >
      {/* HERO */}
      <div className="relative overflow-hidden border-b-2 border-[var(--line)]">
        <Grain />
        <Image
          src="/art/crew-rooftop.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 80vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,11,16,0.94)] via-[rgba(11,11,16,0.6)] to-[rgba(11,11,16,0.3)]" />
        <Splatter className="absolute -left-6 top-4 h-32 w-32 text-[var(--pink)] opacity-60" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 px-4 py-10 sm:px-8">
          <div>
            <h1 className="font-brush text-4xl leading-none text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] sm:text-6xl">
              DOCK — <span className="text-[var(--pink)]">TIMELINE</span> CHRONICLE
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">
              A public chronology of projects, stories, signals, and moments across the Empire.
              Different people. Same sky. Many stories.
            </p>
          </div>
          <div className="text-right">
            <div className="font-brush text-5xl text-[var(--yellow)]">
              {visible.length}
              <span className="text-2xl text-zinc-400">/{timelineEvents.length}</span>
            </div>
            <div className="text-[10px] tracking-widest text-zinc-400">EVENTS VISIBLE</div>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-4 py-6 sm:px-8">
        {/* FILTER BAR */}
        <div className="zine-card-rough flex flex-wrap items-center gap-3 p-3">
          <span className="font-brush text-sm text-white">FILTER BY ERA</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by era">
            <button
              onClick={() => setEra("all")}
              aria-pressed={era === "all"}
              className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${era === "all" ? "border-[var(--pink)] bg-[var(--pink)] font-bold text-white" : "border-[var(--line)] text-zinc-300 hover:border-zinc-500"}`}
            >
              All Eras
            </button>
            {eras.map((e) => (
              <button
                key={e.id}
                onClick={() => setEra(era === e.id ? "all" : e.id)}
                aria-pressed={era === e.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-colors ${era === e.id ? "font-bold text-white" : "border-[var(--line)] text-zinc-300 hover:border-zinc-500"}`}
                style={
                  era === e.id ? { borderColor: e.color, background: `${e.color}33` } : undefined
                }
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.color }} />
                {e.name}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label className="sr-only" htmlFor="dock-sort">
              Sort events
            </label>
            <select
              id="dock-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
              className="zine-input rounded-md px-3 py-1.5 text-[11px]"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
            <div
              className="flex rounded-md border border-[var(--line)]"
              role="group"
              aria-label="View mode"
            >
              <button
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                aria-label="Grid view"
                className={`px-2.5 py-1.5 ${view === "grid" ? "bg-[var(--pink)] text-white" : "text-zinc-400 hover:text-white"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4 L10 4 L10 10 L4 10 Z M14 4 L20 4 L20 10 L14 10 Z M4 14 L10 14 L10 20 L4 20 Z M14 14 L20 14 L20 20 L14 20 Z" />
                </svg>
              </button>
              <button
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                aria-label="List view"
                className={`px-2.5 py-1.5 ${view === "list" ? "bg-[var(--pink)] text-white" : "text-zinc-400 hover:text-white"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 6 L20 6 M4 12 L20 12 M4 18 L20 18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <EraBand eras={eras} active={era} onSelect={setEra} />

        {/* EVENTS + DETAIL */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-label="Events">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-brush text-xl text-white">
                <Crown className="h-5 w-8 text-[var(--yellow)]" /> EVENTS
                <span className="ml-2 hidden text-[10px] font-normal tracking-widest text-zinc-500 sm:inline">
                  KEY MOMENTS, PROJECTS, AND SIGNALS FROM ACROSS THE EMPIRE.
                </span>
              </h2>
              <span className="text-[11px] text-zinc-500">
                Showing {visible.length} of {timelineEvents.length} events
              </span>
            </div>
            {visible.length === 0 ? (
              <div className="zine-card-rough p-10 text-center">
                <p className="font-brush text-xl text-zinc-400">NO SIGNALS FOUND.</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Nothing matches “{query}” in this era. Try another frequency.
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setEra("all");
                  }}
                  className="btn-zine btn-blue mt-4 px-5 py-2 text-sm"
                >
                  RESET FILTERS
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {visible.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    selected={selectedId === ev.id}
                    list={false}
                    onOpen={() => select(ev.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {visible.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    selected={selectedId === ev.id}
                    list
                    onOpen={() => select(ev.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="hidden xl:block" aria-label="Event detail">
            <div className="sticky top-20 h-[calc(100vh-6rem)]">
              {selected && selectedEra ? (
                <EventDetail
                  event={selected}
                  era={selectedEra}
                  relatedEvents={relatedEvents}
                  shareUrl={`${origin}/dock?event=${selected.id}`}
                  onRelated={select}
                />
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      {/* MOBILE/TABLET DETAIL DRAWER */}
      {drawerOpen && selected && selectedEra && (
        <div
          className="fixed inset-0 z-50 xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Event detail"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-md">
            <EventDetail
              event={selected}
              era={selectedEra}
              relatedEvents={relatedEvents}
              shareUrl={`${origin}/dock?event=${selected.id}`}
              onRelated={select}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <Star4 className="pointer-events-none fixed bottom-24 right-6 hidden h-6 w-6 text-[var(--yellow)] opacity-50 xl:block" />
    </EmpireShell>
  );
}
