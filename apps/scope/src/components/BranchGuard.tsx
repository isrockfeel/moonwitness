import { useEffect } from "react";
import { useBranchStore } from "../stores/branch";

export function BranchGuard() {
  const { info, loading, error, check } = useBranchStore();

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Branch Guard
      </h2>

      {loading ? (
        <p className="text-sm text-slate-400">checking…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : info ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                info.allowed ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            <span className="font-mono text-sm text-slate-200">{info.current || "(detached)"}</span>
            {info.protected && (
              <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-300">
                protected
              </span>
            )}
          </div>
          <p className="mb-3 text-xs text-slate-400">{info.reason}</p>

          <div className="mb-3 flex gap-4 text-xs text-slate-400">
            <span>
              ahead <span className="font-mono text-slate-200">{info.ahead}</span>
            </span>
            <span>
              behind <span className="font-mono text-slate-200">{info.behind}</span>
            </span>
            {info.upstream && (
              <span>
                upstream <span className="font-mono text-slate-200">{info.upstream}</span>
              </span>
            )}
          </div>

          <div className="space-y-1">
            {info.topology.branches.map((b) => (
              <div
                key={b.name}
                className={`flex items-center gap-2 text-xs ${
                  b.is_current ? "text-slate-100" : "text-slate-500"
                }`}
              >
                <span className="w-4">{b.is_current ? "▸" : " "}</span>
                <span className="flex-1 font-mono">{b.name}</span>
                {b.is_protected && <span className="text-red-400">protected</span>}
                <span className="text-slate-600">{b.last_commit}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
