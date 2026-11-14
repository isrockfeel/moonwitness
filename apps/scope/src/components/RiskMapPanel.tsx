import { useEffect } from "react";
import { useRiskStore } from "../stores/risk";
import { useWorkspaceStore } from "../stores/workspace";

export function RiskMapPanel() {
  const { map, loading, error, check } = useRiskStore();
  const root = useWorkspaceStore((s) => s.root);

  useEffect(() => {
    if (root) void check(root);
  }, [root, check]);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Risk Map
      </h2>

      {loading ? (
        <p className="text-sm text-slate-400">scanning…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : map ? (
        <div className="space-y-3">
          {/* Dirty packages */}
          <div>
            <h3 className="mb-1 text-xs text-slate-400">
              Dirty packages ({map.dirty_packages.length})
            </h3>
            {map.dirty_packages.length === 0 ? (
              <p className="text-xs text-emerald-400">all clean</p>
            ) : (
              <ul className="space-y-0.5">
                {map.dirty_packages.map((p) => (
                  <li key={p.name} className="flex gap-2 text-xs">
                    <span className="text-yellow-400">●</span>
                    <span className="font-mono text-slate-200">{p.name}</span>
                    <span className="text-slate-500">{p.changed_files} file(s)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Stale packages */}
          <div>
            <h3 className="mb-1 text-xs text-slate-400">
              Stale branches ({map.stale_packages.length})
            </h3>
            {map.stale_packages.length === 0 ? (
              <p className="text-xs text-emerald-400">all fresh</p>
            ) : (
              <ul className="space-y-0.5">
                {map.stale_packages.map((p) => (
                  <li key={p.name} className="flex gap-2 text-xs">
                    <span className="text-yellow-400">●</span>
                    <span className="font-mono text-slate-200">{p.name}</span>
                    <span className="text-slate-500">{p.days_since_change}d old</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Migration status */}
          <div>
            <h3 className="mb-1 text-xs text-slate-400">Migrations</h3>
            <p className="text-xs text-slate-300">
              {map.migration_status.applied}/{map.migration_status.total} applied
              {map.migration_status.pending > 0 && (
                <span className="text-yellow-400"> · {map.migration_status.pending} pending</span>
              )}
            </p>
          </div>

          {/* Env drift */}
          <div>
            <h3 className="mb-1 text-xs text-slate-400">Env schema</h3>
            <div className="flex gap-3 text-xs">
              <span className={map.env_drift.has_schema ? "text-emerald-400" : "text-slate-500"}>
                schema {map.env_drift.has_schema ? "✓" : "✗"}
              </span>
              <span className={map.env_drift.has_example ? "text-emerald-400" : "text-slate-500"}>
                example {map.env_drift.has_example ? "✓" : "✗"}
              </span>
              {map.env_drift.drift && <span className="text-yellow-400">drift detected</span>}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
