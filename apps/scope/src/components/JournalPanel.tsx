import { useEffect } from "react";
import { useJournalStore } from "../stores/journal";
import { useWorkspaceStore } from "../stores/workspace";

export function JournalPanel() {
  const { journal, loading, error, load } = useJournalStore();
  const root = useWorkspaceStore((s) => s.root);

  useEffect(() => {
    if (root) void load(root);
  }, [root, load]);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Daily Journal
      </h2>

      {loading ? (
        <p className="text-sm text-slate-400">loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : journal ? (
        <>
          <p className="mb-3 text-sm text-slate-300">{journal.summary}</p>

          {journal.commits.length > 0 && (
            <div className="mb-3">
              <h3 className="mb-1 text-xs text-slate-500">Commits ({journal.commits.length})</h3>
              <ul className="space-y-1">
                {journal.commits.map((c) => (
                  <li key={c.sha} className="flex gap-2 text-xs">
                    <span className="font-mono text-slate-500">{c.sha}</span>
                    <span className="flex-1 text-slate-300">{c.message}</span>
                    <span className="text-slate-600">{c.author}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {journal.commits.length === 0 && (
            <p className="text-xs text-slate-500">No commits yet today.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
