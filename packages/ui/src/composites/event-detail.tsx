"use client";

import type { Era, TimelineEvent } from "@moonwitness/types";
import { useState } from "react";
import { Crown } from "../icons";
import { ZineImage } from "../primitives/zine-image";
import { KindBadge } from "./event-card";
import { kindColors } from "./kind-colors";

export interface EventDetailProps {
  event: TimelineEvent;
  era: Era;
  relatedEvents: TimelineEvent[];
  shareUrl: string;
  onRelated: (id: string) => void;
  onClose?: () => void;
}

export function EventDetail({
  event,
  era,
  relatedEvents,
  shareUrl,
  onRelated,
  onClose,
}: EventDetailProps) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the signal link:", shareUrl);
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
          <ZineImage
            art={event.image}
            alt=""
            sizes="(max-width: 1280px) 100vw, 30vw"
            position={event.imagePosition}
          />
          <span className="absolute left-3 top-3">
            <KindBadge kind={event.kind} />
          </span>
          <span className="absolute right-3 top-3 bg-black/70 px-2 py-0.5 text-[10px] text-zinc-200">
            {event.date}
          </span>
        </div>

        <div className="p-4">
          <h2 className="font-brush text-2xl leading-tight text-white">
            {event.title.toUpperCase()}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{event.body}</p>

          <dl className="mt-4 space-y-2 border-t border-[var(--line)] pt-3 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Era</dt>
              <dd className="text-zinc-200">
                {era.name} ({era.years})
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Location</dt>
              <dd className="text-right text-zinc-200">{event.location}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Tags</dt>
              <dd className="flex flex-wrap justify-end gap-1">
                {event.tags.map((t) => (
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
                {event.sources} sources · {event.notes} notes
              </dd>
            </div>
          </dl>

          <div className="mt-4 border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <span className="sticker sticker-pink inline-block -rotate-1 px-2 py-0.5 font-brush text-[10px]">
              KEY EXCERPT
            </span>
            <p className="mt-2 font-hand text-lg leading-snug text-zinc-200">“{event.excerpt}”</p>
          </div>

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
        </div>
      </div>
    </div>
  );
}
