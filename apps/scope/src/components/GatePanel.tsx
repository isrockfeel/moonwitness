import { useState } from "react";
import { useGateStore } from "../stores/gate";
import { useWorkspaceStore } from "../stores/workspace";

const GATES = ["quick", "local", "push", "release", "doctor"] as const;

const STATE_COLOR: Record<string, string> = {
  PASS: "text-emerald-400",
  FAIL: "text-red-400",
  BLOCKED: "text-yellow-400",
  "NOT APPLICABLE": "text-slate-500",
};

export function GatePanel() {
  const { running, result, events, error, run } = useGateStore();
  const root = useWorkspaceStore((s) => s.root);
  const [selected, setSelected] = useState<string>("quick");

  const handleRun = () => {
    if (!root) return;
    void run(selected, root);
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Gate Runner
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={running}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
          >
            {GATES.map((g) => (
              <option key={g} value={g}>
                gate:{g}
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={running || !root}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            {running ? "running…" : "run"}
          </button>
        </div>
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={`font-bold ${result.passed ? "text-emerald-400" : "text-red-400"}`}>
              {result.passed ? "PASS" : "FAIL"}
            </span>
            <span className="text-slate-400">
              exit {result.exit_code} · {result.duration_ms}ms
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {result.steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span
                  className={`w-24 shrink-0 font-mono ${STATE_COLOR[s.state] ?? "text-slate-400"}`}
                >
                  {s.state}
                </span>
                <span className="w-32 shrink-0 text-slate-300">{s.step}</span>
                <span className="text-slate-500">{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {running && events.length > 0 && (
        <pre className="max-h-40 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-400">
          {events.slice(-20).join("\n")}
        </pre>
      )}
    </section>
  );
}
