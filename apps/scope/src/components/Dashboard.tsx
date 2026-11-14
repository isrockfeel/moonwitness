import { useWorkspaceStore } from "../stores/workspace";
import { useRadioStore } from "../stores/radio";
import { GatePanel } from "./GatePanel";
import { BranchGuard } from "./BranchGuard";
import { CommitComposer } from "./CommitComposer";
import { ReleaseRadar } from "./ReleaseRadar";
import { RiskMapPanel } from "./RiskMapPanel";
import { DoctorPanel } from "./DoctorPanel";
import { JournalPanel } from "./JournalPanel";
import { SignalViz } from "./SignalViz";

export function Dashboard() {
  const { branch, dirty, ahead, behind, loading, error } = useWorkspaceStore();
  const { health, checking } = useRadioStore();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Scope</h1>
        <p className="text-sm text-slate-400">see the signal, scope the work.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Workspace card */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </h2>
          {loading ? (
            <p className="text-sm text-slate-400">reading…</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">branch</dt>
                <dd className="font-mono text-slate-200">{branch ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">dirty</dt>
                <dd className={dirty ? "text-yellow-400" : "text-emerald-400"}>
                  {dirty ? "yes" : "clean"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">ahead / behind</dt>
                <dd className="font-mono text-slate-200">
                  {ahead} / {behind}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* Radio signal card */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Radio Signal
          </h2>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                health.online ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            <span className="text-sm text-slate-200">
              {checking ? "checking…" : health.online ? "online" : "offline"}
            </span>
          </div>
          {health.latencyMs !== null && (
            <p className="mt-2 text-sm text-slate-400">
              latency {health.latencyMs}ms · {health.listeners} listeners
            </p>
          )}
          {health.error && <p className="mt-2 text-xs text-slate-500">{health.error}</p>}
        </div>
      </section>

      <section className="mt-4">
        <GatePanel />
      </section>

      <section className="mt-4">
        <BranchGuard />
      </section>

      <section className="mt-4">
        <CommitComposer />
      </section>

      <section className="mt-4">
        <ReleaseRadar />
      </section>

      <section className="mt-4">
        <RiskMapPanel />
      </section>

      <section className="mt-4">
        <DoctorPanel />
      </section>

      <section className="mt-4">
        <JournalPanel />
      </section>

      <section className="mt-4">
        <SignalViz />
      </section>
    </main>
  );
}
