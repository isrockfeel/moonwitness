import { useEffect } from "react";
import { useGateStore } from "../stores/gate";
import { useWorkspaceStore } from "../stores/workspace";

const STATE_COLOR: Record<string, string> = {
  PASS: "text-emerald-400",
  FAIL: "text-red-400",
  BLOCKED: "text-yellow-400",
  "NOT APPLICABLE": "text-slate-500",
};

const FIX_SUGGESTIONS: Record<string, string> = {
  "git-user": 'git config user.name "Your Name"',
  "git-email": 'git config user.email "you@example.com"',
  remote: "git remote add origin <url>",
  branch: "git switch dev",
  upstream: "git push -u origin HEAD",
  "pre-push-hook": "pnpm hooks:install",
};

export function DoctorPanel() {
  const { result, running, error, run } = useGateStore();
  const root = useWorkspaceStore((s) => s.root);

  useEffect(() => {
    if (root) void run("doctor", root);
  }, [root, run]);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Doctor</h2>
        <button
          onClick={() => root && void run("doctor", root)}
          disabled={running || !root}
          className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
        >
          {running ? "checking…" : "re-check"}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      {result && result.gate === "doctor" && (
        <ul className="space-y-1">
          {result.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span
                className={`w-24 shrink-0 font-mono ${STATE_COLOR[s.state] ?? "text-slate-400"}`}
              >
                {s.state}
              </span>
              <div className="flex-1">
                <span className="text-slate-300">{s.step}</span>
                {s.detail && <span className="ml-2 text-slate-500">{s.detail}</span>}
                {s.state !== "PASS" && FIX_SUGGESTIONS[s.step] && (
                  <code className="mt-0.5 block text-xs text-cyan-400">
                    $ {FIX_SUGGESTIONS[s.step]}
                  </code>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
