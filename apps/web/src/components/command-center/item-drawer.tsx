"use client";

import type { ArtKey } from "@moonwitness/types";
import { ZineImage } from "@moonwitness/ui";
import { useFocusTrap } from "./use-focus-trap";

export interface ItemDrawerDetail {
  title: string;
  subtitle: string;
  art?: ArtKey;
  rows: { label: string; value: string }[];
}

export interface ItemDrawerProps {
  detail: ItemDrawerDetail;
  onClose: () => void;
}

export function ItemDrawer({ detail, onClose }: ItemDrawerProps) {
  const dialogRef = useFocusTrap(true, onClose);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`${detail.title} detail`}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="zine-card-rough absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-wider text-zinc-500">
              {detail.subtitle.toUpperCase()}
            </p>
            <h2 className="font-brush mt-1 text-3xl leading-tight text-white">{detail.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="min-h-11 min-w-11 shrink-0 p-2 text-zinc-400 hover:text-[var(--pink)]"
          >
            ✕
          </button>
        </div>
        {detail.art && (
          <div className="relative mt-4 h-40 overflow-hidden rounded-md border-2 border-[var(--line)]">
            <ZineImage art={detail.art} sizes="(max-width: 768px) 100vw, 448px" />
          </div>
        )}
        <dl className="mt-5 divide-y divide-[var(--line)]">
          {detail.rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-[10px] tracking-wider text-zinc-500">
                {row.label.toUpperCase()}
              </dt>
              <dd className="min-w-0 truncate text-right text-xs text-zinc-200">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
