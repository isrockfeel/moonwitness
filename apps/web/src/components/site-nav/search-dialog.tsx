import { ZineInput } from "@moonwitness/ui";

export interface SearchDialogProps {
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function SearchDialog({ query, onQueryChange, onSubmit, onClose }: SearchDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 pt-28 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="zine-card-rough w-full max-w-xl p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search the archive"
      >
        <label htmlFor="nav-search" className="font-brush text-lg text-[var(--yellow)]">
          SEARCH THE SIGNALS
        </label>
        <div className="mt-3 flex gap-2">
          <ZineInput
            id="nav-search"
            autoFocus
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
