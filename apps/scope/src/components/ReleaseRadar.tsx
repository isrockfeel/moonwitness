import { useEffect } from "react";
import { useReleaseStore } from "../stores/release";
import { useWorkspaceStore } from "../stores/workspace";

export function ReleaseRadar() {
  const { status, loading, error, check } = useReleaseStore();
  const root = useWorkspaceStore((s) => s.root);

  useEffect(() => {
    if (root) void check(root);
  }, [root, check]);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Release Radar
      </h2>

      {loading ? (
        <p className="text-sm text-slate-400">checking…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : status ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                status.ready ? "bg-emerald-400" : "bg-yellow-400"
              }`}
            />
            <span className="font-mono text-sm text-slate-200">
              v{status.version || "(no version)"}
            </span>
            <span className="text-xs text-slate-500">
              {status.ready ? "ready to release" : "not ready"}
            </span>
          </div>

          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">manifest</dt>
              <dd className={status.manifest_drift ? "text-yellow-400" : "text-emerald-400"}>
                {status.manifest_drift ? `drift (${status.manifest_version})` : "in sync"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">changelog</dt>
              <dd className={status.changelog_entry ? "text-emerald-400" : "text-red-400"}>
                {status.changelog_entry ? "entry present" : "missing"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">tag</dt>
              <dd className={status.tag_free ? "text-emerald-400" : "text-red-400"}>
                {status.tag_free ? "available" : "exists"}
              </dd>
            </div>
          </dl>

          {status.blockers.length > 0 && (
            <ul className="mt-3 space-y-0.5">
              {status.blockers.map((b, i) => (
                <li key={i} className="text-xs text-yellow-400">
                  ⚠ {b}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
