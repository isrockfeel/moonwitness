"use client";

import { useEffect, useRef } from "react";
import { ZineInput } from "@moonwitness/ui";

export interface SearchDialogProps {
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function SearchDialog({ query, onQueryChange, onSubmit, onClose }: SearchDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Escape closes the dialog; Tab cycles within the dialog's focusable elements.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = formRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        (last as HTMLElement).focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        (first as HTMLElement).focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const firstInput = formRef.current?.querySelector<HTMLInputElement>("input");
    firstInput?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 pt-28 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="zine-card-rough w-full max-w-xl p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search the archive"
      >
        <div className="flex items-start justify-between gap-4">
          <label htmlFor="nav-search" className="font-brush text-lg text-[var(--yellow)]">
            SEARCH THE SIGNALS
          </label>
          <button type="button" onClick={onClose} className="btn-zine min-h-11 px-3 text-sm">
            Close search
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <ZineInput
            id="nav-search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="stories, signals, people, places…"
            className="rounded-md px-4 py-3 text-sm"
          />
          <button type="submit" className="btn-zine px-5 py-2 text-sm">
            GO
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Searches the Dock timeline chronicle.</p>
      </form>
    </div>
  );
}
