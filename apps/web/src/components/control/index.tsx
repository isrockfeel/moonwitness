"use client";

import { useMemo, useState } from "react";
import { Sticker, Tape, ZineBadge, ZineCard, ZineCardRough } from "@moonwitness/ui";
import { Crown, Star4 } from "@moonwitness/ui/icons";
import { EmpireShell } from "@/components/shell";
import { OperationsShell } from "@/components/operations/operations-shell";
import {
  useControlAudit,
  useControlResources,
  useControlStatus,
  type HostMetrics,
  type Observation,
} from "@/lib/api/control";
import { useLogout } from "@/lib/api/onboarding";
import { ControlGate } from "./gate";

type Kind =
  | "systemd"
  | "docker"
  | "network"
  | "ssh"
  | "cert"
  | "mount"
  | "alert"
  | "gitdeploy"
  | "dockercompose"
  | "package"
  | "backup"
  | "kubernetes";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

function formatUptime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function Gauge({
  label,
  pct,
  detail,
  tone,
}: {
  label: string;
  pct: number;
  detail: string;
  tone: string;
}) {
  const clamped = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  return (
    <ZineCard className="relative overflow-hidden p-4">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />
      <div className="font-brush text-3xl leading-none" style={{ color: tone }}>
        {clamped.toFixed(0)}%
      </div>
      <div className="mt-2 text-[10px] tracking-widest text-zinc-500">{label}</div>
      <div className="mt-2 h-1.5 w-full border border-[var(--line)] bg-black/40">
        <div className="h-full" style={{ width: `${clamped}%`, background: tone }} />
      </div>
      <div className="mt-1.5 text-[11px] text-zinc-400">{detail}</div>
    </ZineCard>
  );
}

function CapabilityChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`border px-2 py-0.5 text-[10px] tracking-widest ${
        on
          ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
          : "border-[var(--line)] text-zinc-600"
      }`}
    >
      {label}
    </span>
  );
}

function ObservationRow({ name, obs }: { name: string; obs: Observation }) {
  const fields = obs.fields ?? {};
  const state = fields.state ?? fields.status ?? (obs.exists ? "present" : "missing");
  const good = obs.exists && !["stopped", "exited", "dead", "failed"].includes(state.toLowerCase());
  return (
    <tr className="border-b border-[var(--line)]/60 last:border-b-0">
      <td className="px-3 py-2 font-mono text-xs text-zinc-200">{name}</td>
      <td className="px-3 py-2">
        <span
          className={`inline-block border px-2 py-0.5 text-[10px] tracking-widest ${
            good
              ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
              : "border-[var(--red)]/50 bg-[var(--red)]/10 text-[var(--red)]"
          }`}
        >
          {state.toUpperCase()}
        </span>
      </td>
      <td className="px-3 py-2 text-[11px] text-zinc-500">
        {Object.entries(fields)
          .filter(([key]) => !["state", "status"].includes(key))
          .map(([key, value]) => `${key}=${value}`)
          .join(" · ") ||
          (obs.detail ?? "—")}
      </td>
    </tr>
  );
}

function ResourcePanel({ kind }: { kind: Kind }) {
  const { data, isLoading, error } = useControlResources(kind);
  const payload: unknown = data?.[kind];
  // arsy mengirim { "<kind>": { error: "..." } } bila backend-nya tidak tersedia.
  const kindError =
    payload && typeof (payload as { error?: unknown }).error === "string"
      ? (payload as { error: string }).error
      : null;
  const rows = useMemo<[string, Observation][]>(
    () =>
      !payload || kindError
        ? []
        : Object.entries(payload as Record<string, Observation>).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
    [payload, kindError],
  );

  return (
    <ZineCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-2 border-[var(--line)] px-4 py-3">
        <h2 className="font-brush text-lg text-white">
          {kind.toUpperCase()}{" "}
          <span className="text-[var(--blue)]">
            {kind === "systemd" || kind === "docker" ? "UNITS" : "RESOURCES"}
          </span>
        </h2>
        <ZineBadge color="#2ea8ff" dark>
          {isLoading ? "SYNCING" : error || kindError ? "UNAVAILABLE" : `${rows.length} SEEN`}
        </ZineBadge>
      </div>
      {error || kindError ? (
        <p className="px-4 py-6 text-sm text-[var(--yellow)]">
          {kindError ?? (error as Error).message}
        </p>
      ) : rows.length === 0 && !isLoading ? (
        <p className="px-4 py-6 text-sm text-zinc-500">Tidak ada resource yang cocok allowlist.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[9px] tracking-[0.2em] text-zinc-500">
                <th className="px-3 py-2 font-normal">NAME</th>
                <th className="px-3 py-2 font-normal">STATE</th>
                <th className="px-3 py-2 font-normal">FIELDS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, obs]) => (
                <ObservationRow key={name} name={name} obs={obs} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ZineCard>
  );
}

function HostCard({
  host,
  metrics,
}: {
  host: NonNullable<ReturnType<typeof useControlStatus>["data"]>["host"];
  metrics: HostMetrics;
}) {
  return (
    <ZineCardRough className="relative overflow-hidden p-5">
      <Star4 className="absolute right-4 top-4 h-6 w-6 text-[var(--pink)] opacity-70" />
      <p className="text-[10px] tracking-[0.25em] text-zinc-500">HOST AGENT</p>
      <h2 className="mt-1 font-brush text-2xl text-white">{host.hostname || "unknown-host"}</h2>
      <p className="mt-1 font-hand text-lg text-[var(--yellow)]">
        {host.distro || host.os}
        {host.wsl_distro ? ` · WSL ${host.wsl_distro}` : ""} · {host.arch}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div>
          <dt className="text-zinc-500">OS</dt>
          <dd className="text-zinc-200">{host.os}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">KERNEL</dt>
          <dd className="truncate text-zinc-200">{host.kernel || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">ROOT</dt>
          <dd className={host.is_root ? "text-[var(--green)]" : "text-zinc-400"}>
            {host.is_root ? "yes" : "no"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">UPTIME</dt>
          <dd className="text-zinc-200">{formatUptime(metrics.uptime_sec)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <CapabilityChip label="SYSTEMD" on={host.capabilities.systemd} />
        <CapabilityChip label="DOCKER" on={host.capabilities.docker} />
        <CapabilityChip label="FILES" on={host.capabilities.files} />
        <CapabilityChip label="CRON" on={host.capabilities.cron} />
        <CapabilityChip label="USERS" on={host.capabilities.users} />
        <CapabilityChip label="FIREWALL" on={host.capabilities.firewall} />
        <CapabilityChip label="METRICS" on={host.capabilities.host_metrics} />
        <CapabilityChip label="NETWORK" on={host.capabilities.network} />
        <CapabilityChip label="SSH" on={host.capabilities.ssh} />
        <CapabilityChip label="CERT" on={host.capabilities.cert} />
        <CapabilityChip label="MOUNT" on={host.capabilities.mount} />
        <CapabilityChip label="ALERT" on={host.capabilities.alert} />
        <CapabilityChip label="K8S" on={host.capabilities.kubernetes} />
      </div>
      {metrics.degraded && (
        <p className="mt-3 border border-[var(--yellow)]/40 bg-[var(--yellow)]/10 px-3 py-2 text-[11px] text-[var(--yellow)]">
          Metrik host terdegradasi{metrics.notes?.length ? `: ${metrics.notes.join(", ")}` : ""}
        </p>
      )}
    </ZineCardRough>
  );
}

function AuditPanel() {
  const { data, isLoading } = useControlAudit(20);
  const entries = data ?? [];
  return (
    <ZineCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-2 border-[var(--line)] px-4 py-3">
        <h2 className="font-brush text-lg text-white">
          AUDIT <span className="text-[var(--pink)]">TRAIL</span>
        </h2>
        <span className="text-[10px] tracking-widest text-zinc-500">
          {isLoading ? "READING…" : `${entries.length} ENTRIES`}
        </span>
      </div>
      {entries.length === 0 && !isLoading ? (
        <p className="px-4 py-6 text-sm text-zinc-500">Belum ada aktivitas tercatat.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]/60">
          {entries.map((entry, i) => (
            <li
              key={`${entry.time}-${i}`}
              className="flex flex-wrap items-baseline gap-x-3 px-4 py-2"
            >
              <span className="font-mono text-[10px] text-zinc-600">
                {new Date(entry.time).toLocaleString()}
              </span>
              <span className="font-mono text-[11px] text-zinc-300">
                {entry.method} {entry.path}
              </span>
              <span
                className={`text-[10px] tracking-widest ${
                  entry.result === "denied" || entry.result === "error"
                    ? "text-[var(--red)]"
                    : "text-[var(--green)]"
                }`}
              >
                {entry.result.toUpperCase()}
              </span>
              <span className="text-[10px] text-zinc-600">{entry.role}</span>
              {entry.error && <span className="text-[10px] text-zinc-500">{entry.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </ZineCard>
  );
}

function OnboardingPanel({ reachable }: { reachable: boolean }) {
  if (reachable) return null;
  const steps = [
    {
      n: "1",
      title: "Pasang arsy di VPS",
      body: "sudo ./install.sh --domain <host> --email <email> --with-app --with-caddy (atau --dry-run dulu)",
    },
    {
      n: "2",
      title: "Set env di apps/api",
      body: "ARSY_URL=http://127.0.0.1:8787 ARSY_TOKEN_READONLY=<token>",
    },
    {
      n: "3",
      title: "Jalankan arsy serve",
      body: "systemctl status arsy.service; journalctl -u arsy -n 50",
    },
    {
      n: "4",
      title: "Verifikasi",
      body: 'curl -H "Authorization: Bearer <token>" http://127.0.0.1:8787/v1/host',
    },
  ];
  return (
    <ZineCardRough className="relative overflow-hidden p-5">
      <Tape className="-top-3 left-10 -rotate-3" />
      <p className="text-[10px] tracking-[0.25em] text-zinc-500">ONBOARDING</p>
      <h2 className="mt-1 font-brush text-2xl text-white">
        ARSY <span className="text-[var(--pink)]">BELUM TERHUBUNG</span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Ikuti langkah berikut untuk menghubungkan dashboard ke control plane. Semua aksi tetap lewat
        CLI; dashboard hanya membaca.
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.n} className="flex gap-3">
            <span className="font-brush text-xl text-[var(--yellow)]">{step.n}</span>
            <div>
              <p className="text-xs font-bold tracking-wider text-zinc-200">{step.title}</p>
              <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </ZineCardRough>
  );
}
function ControlBody() {
  const status = useControlStatus();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => window.location.reload(),
      onError: () => window.location.reload(),
    });
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-brush text-3xl text-white sm:text-4xl">
            ARSY <span className="text-[var(--pink)]">CONTROL PLANE</span>
          </h1>
          <p className="mt-1 max-w-xl font-hand text-xl text-zinc-400">
            Observe the server, reconcile declared state, keep the empire honest.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sticker tone="yellow" className="-rotate-2 px-3 py-1 font-brush text-xs">
            <Crown className="mr-1 inline h-3 w-5" /> WEB → API → ARSY
          </Sticker>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-zine btn-paper px-3 py-2 text-[11px]"
          >
            KELUAR
          </button>
        </div>
      </header>

      {status.isLoading ? (
        <div className="flex h-[40vh] items-center justify-center font-brush text-xl text-[var(--pink)]">
          REACHING THE CONTROL PLANE…
        </div>
      ) : status.isError ? (
        <>
          <OnboardingPanel reachable={false} />
          <ZineCardRough className="p-6">
            <h2 className="font-brush text-2xl text-[var(--red)]">ARSY UNREACHABLE</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              {(status.error as Error).message}. Jalankan <code>arsy serve</code> di host, lalu
              pastikan <code>ARSY_URL</code> dan token read-only diatur pada apps/api.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Dashboard hanya membaca; aksi tulis tetap lewat CLI atau{" "}
              <code>ARSY_PROXY_ADMIN=1</code>.
            </p>
          </ZineCardRough>
        </>
      ) : (
        status.data && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <HostCard host={status.data.host} metrics={status.data.metrics} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Gauge
                  label="CPU"
                  pct={status.data.metrics.cpu_pct}
                  detail={`load ${status.data.metrics.load1.toFixed(2)} / ${status.data.metrics.load5.toFixed(2)} / ${status.data.metrics.load15.toFixed(2)}`}
                  tone="var(--pink)"
                />
                <Gauge
                  label="MEMORY"
                  pct={status.data.metrics.mem_pct}
                  detail={
                    status.data.metrics.mem_total > 0
                      ? `${formatBytes(status.data.metrics.mem_used)} / ${formatBytes(status.data.metrics.mem_total)}`
                      : `${formatBytes(status.data.metrics.mem_used)} · total tidak tersedia`
                  }
                  tone="var(--blue)"
                />
                <Gauge
                  label="DISK"
                  pct={status.data.metrics.disk_pct}
                  detail={
                    status.data.metrics.disk_total > 0
                      ? `${formatBytes(status.data.metrics.disk_used)} / ${formatBytes(status.data.metrics.disk_total)}`
                      : `${status.data.metrics.disk_path} · total tidak tersedia`
                  }
                  tone="var(--yellow)"
                />
                <Gauge
                  label="SWAP"
                  pct={
                    status.data.metrics.swap_total > 0
                      ? (status.data.metrics.swap_used / status.data.metrics.swap_total) * 100
                      : 0
                  }
                  detail={
                    status.data.metrics.swap_total > 0
                      ? `${formatBytes(status.data.metrics.swap_used)} / ${formatBytes(status.data.metrics.swap_total)}`
                      : "no swap"
                  }
                  tone="var(--green)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ResourcePanel kind="systemd" />
              <ResourcePanel kind="docker" />
              <ResourcePanel kind="network" />
              <ResourcePanel kind="ssh" />
              <ResourcePanel kind="cert" />
              <ResourcePanel kind="mount" />
              <ResourcePanel kind="alert" />
              <ResourcePanel kind="gitdeploy" />
              <ResourcePanel kind="dockercompose" />
              <ResourcePanel kind="package" />
              <ResourcePanel kind="backup" />
              <ResourcePanel kind="kubernetes" />
            </div>

            <AuditPanel />
          </>
        )
      )}
    </div>
  );
}

export function ControlCenter() {
  return (
    <ControlGate>
      <ControlDashboard />
    </ControlGate>
  );
}

export function ControlOperations() {
  return (
    <ControlGate>
      <ControlDashboard shell="operations" />
    </ControlGate>
  );
}

function ControlDashboard({ shell = "empire" }: { shell?: "empire" | "operations" }) {
  const [query, setQuery] = useState("");
  const body = <ControlBody />;

  if (shell === "operations") {
    return <OperationsShell title="Control">{body}</OperationsShell>;
  }

  return (
    <EmpireShell
      breadcrumb="Control Plane"
      search={{ value: query, onChange: setQuery, placeholder: "Filter host state…" }}
    >
      {body}
    </EmpireShell>
  );
}
