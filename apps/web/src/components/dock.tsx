"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { EmpireShell } from "./empire-shell";
import { ArrowRight, Crown, Splatter, Star4 } from "@moonwitness/ui/icons";
import { artSrc } from "@/lib/art";
import { timelineEvents, eras, kindColors, type TimelineEvent } from "@/lib/data";

function KindBadge({ kind }: { kind: TimelineEvent["kind"] }) {
  return (
    <span
      className="px-2 py-0.5 font-brush text-[10px]"
      style={{ background: kindColors[kind], color: kind === "SIGNAL" ? "#111" : "#fff" }}
    >
      {kind}
    </span>
  );
}

function EventCard({
  ev,
  selected,
  onSelect,
  list,
}: {
  ev: TimelineEvent;
  selected: boolean;
  onSelect: () => void;
  list: boolean;
}) {
  if (list) {
    return (
      <button
        onClick={onSelect}
        className={`zine-card flex w-full items-center gap-4 p-3 text-left transition-colors ${selected ? "border-[var(--pink)]" : "hover:border-zinc-500"}`}
      >
        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-sm">
          <Image
            src={artSrc(ev.image)}
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: ev.imagePosition ?? "center" }}
            sizes="96px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <KindBadge kind={ev.kind} />
            <span className="text-[10px] text-zinc-500">{ev.date}</span>
          </div>
          <h3 className="font-brush mt-1 truncate text-base text-white">
            {ev.title.toUpperCase()}
          </h3>
          <p className="truncate text-xs text-zinc-400">{ev.excerpt}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
      </button>
    );
  }
  return (
    <button
      onClick={onSelect}
      className={`zine-card group overflow-hidden text-left transition-all hover:-translate-y-1 ${selected ? "border-[var(--pink)] shadow-[0_0_0_2px_var(--pink)]" : ""}`}
    >
      <div className="relative h-28 overflow-hidden">
        <Image
          src={artSrc(ev.image)}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: ev.imagePosition ?? "center" }}
          sizes="(max-width: 768px) 100vw, 25vw"
        />
        <span className="absolute left-2 top-2">
          <KindBadge kind={ev.kind} />
        </span>
        <span className="absolute right-2 top-2 bg-black/70 px-2 py-0.5 text-[10px] text-zinc-300">
          {ev.date}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-brush text-lg leading-snug text-white group-hover:text-[var(--pink)]">
          {ev.title.toUpperCase()}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{ev.excerpt}</p>
        <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500">
          <span>
            {ev.sources} sources · {ev.notes} notes
          </span>
          <span className="flex h-7 w-7 items-center justify-center border border-[var(--line)] text-zinc-400 group-hover:border-[var(--pink)] group-hover:text-[var(--pink)]">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

function EventDetail({
  ev,
  onSelect,
  onClose,
}: {
  ev: TimelineEvent;
  onSelect: (id: string) => void;
  onClose?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const era = eras.find((e) => e.id === ev.era);
  const related = timelineEvents.filter((e) => ev.related.includes(e.id));

  async function share() {
    const url = `${window.location.origin}/dock?event=${ev.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the signal link:", url);
    }
  }

  return (
    <div className="zine-card-rough flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-[var(--line)] px-4 py-3">
        <span className="flex items-center gap-2 font-brush text-lg text-white">
          <Crown className="h-4 w-6 text-[var(--yellow)]" /> EVENT DETAIL
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={share}
            className="text-xs text-[var(--blue)] hover:underline"
            aria-label="Share event link"
          >
            {copied ? "Copied ✓" : "Share ↗"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close event detail"
              className="p-1 text-zinc-400 hover:text-[var(--pink)]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative h-40">
          <Image
            src={artSrc(ev.image)}
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: ev.imagePosition ?? "center" }}
            sizes="(max-width: 1280px) 100vw, 30vw"
          />
          <span className="absolute left-3 top-3">
            <KindBadge kind={ev.kind} />
          </span>
          <span className="absolute right-3 top-3 bg-black/70 px-2 py-0.5 text-[10px] text-zinc-200">
            {ev.date}
          </span>
        </div>

        <div className="p-4">
          <h2 className="font-brush text-2xl leading-tight text-white">{ev.title.toUpperCase()}</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{ev.body}</p>

          <dl className="mt-4 space-y-2 border-t border-[var(--line)] pt-3 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Era</dt>
              <dd className="text-zinc-200">
                {era?.name} ({era?.years})
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Location</dt>
              <dd className="text-right text-zinc-200">{ev.location}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Tags</dt>
              <dd className="flex flex-wrap justify-end gap-1">
                {ev.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--purple)]"
                  >
                    {t}
                  </span>
                ))}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Related</dt>
              <dd className="text-zinc-200">
                {ev.sources} sources · {ev.notes} notes
              </dd>
            </div>
          </dl>

          <div className="mt-4 border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <span className="sticker sticker-pink inline-block -rotate-1 px-2 py-0.5 font-brush text-[10px]">
              KEY EXCERPT
            </span>
            <p className="mt-2 font-hand text-lg leading-snug text-zinc-200">“{ev.excerpt}”</p>
          </div>

          <h3 className="font-brush mt-5 text-sm text-[var(--yellow)]">RELATED EVENTS</h3>
          <div className="mt-2 space-y-1.5">
            {related.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelect(r.id)}
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
            {related.length === 0 && (
              <p className="text-xs text-zinc-500">No related signals yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dock() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [era, setEra] = useState<string>(params.get("era") ?? "all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = params.get("event");
    return timelineEvents.some((e) => e.id === id) ? id : "moonwitness-born";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      <div className="grain relative overflow-hidden border-b-2 border-[var(--line)]">
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

        {/* ERA BAND */}
        <div className="zine-card-rough overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-5">
            {eras.map((e) => (
              <button
                key={e.id}
                onClick={() => setEra(era === e.id ? "all" : e.id)}
                aria-pressed={era === e.id}
                className={`group relative h-28 overflow-hidden border-r border-[var(--line)] text-left last:border-r-0 ${era === e.id ? "ring-2 ring-inset" : ""}`}
                style={
                  era === e.id ? ({ "--tw-ring-color": e.color } as React.CSSProperties) : undefined
                }
              >
                <Image
                  src={
                    e.id === "fracture"
                      ? "/art/signal-tunnel.png"
                      : e.id === "origins"
                        ? "/art/city-shadow.png"
                        : e.id === "neon"
                          ? "/art/hero-witness.png"
                          : e.id === "rebuilding"
                            ? "/art/city-shadow.png"
                            : "/art/crew-rooftop.png"
                  }
                  alt=""
                  fill
                  className={`object-cover transition-all duration-300 ${era === e.id ? "" : "grayscale group-hover:grayscale-0"}`}
                  sizes="20vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <div className="font-brush text-sm leading-tight" style={{ color: e.color }}>
                    {e.name.toUpperCase()}
                  </div>
                  <div className="text-[9px] text-zinc-400">{e.years}</div>
                  <div className="mt-0.5 hidden font-hand text-sm leading-tight text-zinc-300 sm:block">
                    {e.tagline}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="relative h-8 border-t border-[var(--line)] bg-[var(--panel-2)]">
            <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-[var(--paper)] via-[var(--pink)] via-40% to-[var(--purple)]" />
            {eras.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setEra(era === e.id ? "all" : e.id)}
                aria-label={`Filter ${e.name}`}
                className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--ink)] transition-transform hover:scale-125 ${era === e.id ? "scale-125" : ""}`}
                style={{ left: `${10 + i * 20}%`, background: e.color }}
              />
            ))}
          </div>
        </div>

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
                    ev={ev}
                    selected={selectedId === ev.id}
                    onSelect={() => select(ev.id)}
                    list={false}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {visible.map((ev) => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    selected={selectedId === ev.id}
                    onSelect={() => select(ev.id)}
                    list
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="hidden xl:block" aria-label="Event detail">
            <div className="sticky top-20 h-[calc(100vh-6rem)]">
              {selected ? <EventDetail ev={selected} onSelect={select} /> : null}
            </div>
          </aside>
        </div>
      </div>

      {/* MOBILE/TABLET DETAIL DRAWER */}
      {drawerOpen && selected && (
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
            <EventDetail ev={selected} onSelect={select} onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <Star4 className="pointer-events-none fixed bottom-24 right-6 hidden h-6 w-6 text-[var(--yellow)] opacity-50 xl:block" />
    </EmpireShell>
  );
}
