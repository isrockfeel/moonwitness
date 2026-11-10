import type { EventKind, TimelineEvent } from "@moonwitness/types";
import { ArrowRight } from "../icons";
import { ZineBadge } from "../primitives/zine-badge";
import { ZineImage } from "../primitives/zine-image";
import { kindColors } from "./kind-colors";

function KindBadge({ kind }: { kind: EventKind }) {
  return (
    <ZineBadge color={kindColors[kind]} dark={kind === "SIGNAL"}>
      {kind}
    </ZineBadge>
  );
}

export interface EventCardProps {
  event: TimelineEvent;
  selected: boolean;
  list: boolean;
  onOpen: () => void;
}

export function EventCard({ event, selected, list, onOpen }: EventCardProps) {
  if (list) {
    return (
      <button
        onClick={onOpen}
        className={`zine-card flex w-full items-center gap-4 p-3 text-left transition-colors ${selected ? "border-[var(--pink)]" : "hover:border-zinc-500"}`}
      >
        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-sm">
          <ZineImage art={event.image} alt="" sizes="96px" position={event.imagePosition} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <KindBadge kind={event.kind} />
            <span className="text-[10px] text-zinc-500">{event.date}</span>
          </div>
          <h3 className="font-brush mt-1 truncate text-base text-white">
            {event.title.toUpperCase()}
          </h3>
          <p className="truncate text-xs text-zinc-400">{event.excerpt}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
      </button>
    );
  }
  return (
    <button
      onClick={onOpen}
      className={`zine-card group overflow-hidden text-left transition-all hover:-translate-y-1 ${selected ? "border-[var(--pink)] shadow-[0_0_0_2px_var(--pink)]" : ""}`}
    >
      <div className="relative h-28 overflow-hidden">
        <ZineImage
          art={event.image}
          alt=""
          sizes="(max-width: 768px) 100vw, 25vw"
          position={event.imagePosition}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2">
          <KindBadge kind={event.kind} />
        </span>
        <span className="absolute right-2 top-2 bg-black/70 px-2 py-0.5 text-[10px] text-zinc-300">
          {event.date}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-brush text-lg leading-snug text-white group-hover:text-[var(--pink)]">
          {event.title.toUpperCase()}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{event.excerpt}</p>
        <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500">
          <span>
            {event.sources} sources · {event.notes} notes
          </span>
          <span className="flex h-7 w-7 items-center justify-center border border-[var(--line)] text-zinc-400 group-hover:border-[var(--pink)] group-hover:text-[var(--pink)]">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

export { KindBadge };
