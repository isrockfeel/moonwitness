"use client";

import { feedItems } from "@/lib/data";

interface NotificationsProps {
  open: boolean;
  onToggle: () => void;
}

export function Notifications({ open, onToggle }: NotificationsProps) {
  return (
    <>
      <button
        onClick={onToggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative rounded-md p-2 text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 9 A6 6 0 1 0 6 9 L4 17 L20 17 Z M10 20 Q12 22 14 20" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--pink)] text-[9px] font-bold text-white">
          3
        </span>
      </button>
      {open && (
        <div className="zine-card absolute right-0 top-12 w-80 p-3" role="dialog" aria-label="Notifications">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-brush text-sm text-[var(--yellow)]">COMMAND FEED</span>
            <span className="text-[10px] text-zinc-500">3 unread</span>
          </div>
          {feedItems.slice(0, 3).map((f) => (
            <div key={f.id} className="flex items-start gap-2 border-t border-[var(--line)] px-1 py-2.5">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: f.color }} />
              <div>
                <p className="text-xs leading-snug text-zinc-200">{f.text}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{f.ago}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
