import { ArrowRight, TornTicket } from "../icons";
import { ZineBadge } from "../primitives/zine-badge";
import { ZineImage } from "../primitives/zine-image";
import { defaultKindColors } from "./kind-colors";
import { Staple } from "../primitives/tactile-hardware";

export interface EventCardData {
  id: string;
  kind: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  imagePosition?: string;
  sources?: number;
  notes?: number;
}

export function KindBadge({ kind, color }: { kind: string; color?: string }) {
  const c = color ?? defaultKindColors[kind] ?? "#9ca3af";
  return (
    <ZineBadge color={c} dark={kind === "SIGNAL"}>
      {kind}
    </ZineBadge>
  );
}

export interface EventCardProps<T extends EventCardData = EventCardData> {
  event: T;
  selected: boolean;
  list: boolean;
  onOpen: () => void;
}

export function EventCard<T extends EventCardData>({
  event,
  selected,
  list,
  onOpen,
}: EventCardProps<T>) {
  if (list) {
    return (
      <button
        onClick={onOpen}
        className={`zine-card photocopy-grit flex w-full items-center gap-4 p-3 text-left transition-all hover:translate-x-1 ${selected ? "border-[var(--pink)] bg-[var(--panel-2)] shadow-[4px_4px_0_var(--pink)]" : "hover:border-zinc-500"}`}
      >
        <div className="relative h-14 w-24 shrink-0 overflow-hidden border border-black/40">
          <ZineImage art={event.image} alt="" sizes="96px" position={event.imagePosition} />
          <Staple className="top-1 left-1 -rotate-45" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <KindBadge kind={event.kind} />
            <span className="font-mono text-[10px] text-zinc-400">{event.date}</span>
          </div>
          <h3 className="cmyk-slip font-brush mt-1 truncate text-base text-white">
            {event.title.toUpperCase()}
          </h3>
          <p className="truncate font-mono text-xs text-zinc-400">{event.excerpt}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" />
      </button>
    );
  }
  return (
    <button
      onClick={onOpen}
      className={`zine-card photocopy-grit group relative overflow-hidden text-left transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[-0.7deg] ${selected ? "border-[var(--pink)] shadow-[6px_6px_0_var(--pink)]" : "shadow-[5px_5px_0_rgba(0,0,0,0.7)]"}`}
    >
      <Staple className="top-1 left-2 -rotate-12" />
      <div className="relative h-32 overflow-hidden bg-black/50">
        <ZineImage
          art={event.image}
          alt=""
          sizes="(max-width: 768px) 100vw, 25vw"
          position={event.imagePosition}
          className="transition-transform duration-700 group-hover:scale-110"
        />
        <span className="absolute left-2 top-2 z-10">
          <KindBadge kind={event.kind} />
        </span>
        <span className="absolute right-2 top-2 z-10 border border-black bg-black/80 px-2 py-0.5 font-mono text-[10px] text-[var(--yellow)] shadow-[1px_1px_0_rgba(0,0,0,0.8)]">
          {event.date}
        </span>
      </div>
      <div className="p-4 bg-gradient-to-b from-[var(--panel)] to-[#0c0c12]">
        <h3 className="cmyk-slip font-brush text-lg leading-snug text-white group-hover:text-[var(--pink)]">
          {event.title.toUpperCase()}
        </h3>
        <p className="mt-1.5 line-clamp-2 font-mono text-xs leading-relaxed text-zinc-400">
          {event.excerpt}
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2 font-mono text-[10px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <TornTicket className="h-3.5 w-3.5 text-[var(--yellow)]" />
            {event.sources ?? 0} docs · {event.notes ?? 0} notes
          </span>
          <span className="flex h-7 w-7 items-center justify-center border border-[var(--line)] bg-black/50 text-zinc-300 transition-colors group-hover:border-[var(--pink)] group-hover:bg-[var(--pink)] group-hover:text-white">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}
