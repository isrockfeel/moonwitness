"use client";

import { useState } from "react";
import { ZineBadge, ZineCard, ZineCardRough, ZineInput } from "@moonwitness/ui";
import { EmpireShell } from "@/components/shell";
import {
  useCreateRadiusUser,
  useDeleteRadiusUser,
  useRadiusLogs,
  useRadiusStats,
  useRadiusUsers,
  useUpdateRadiusUser,
  type RadiusLog,
  type RadiusUser,
} from "@/lib/api/radius";

function formatTime(epoch: number): string {
  if (!Number.isFinite(epoch) || epoch <= 0) return "—";
  return new Date(epoch * 1000).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function resultTone(result: string): string {
  if (result === "accept" || result === "recorded") return "var(--green)";
  if (result.startsWith("reject")) return "var(--red)";
  return "var(--yellow)";
}

function UserRow({
  user,
  onToggle,
  onDelete,
  busy,
}: {
  user: RadiusUser;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <tr className="border-b border-[var(--line)]/60 last:border-b-0">
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-zinc-200">{user.username}</span>
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">
        {user.framed_ip || "pool"}
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">
        {user.vlan_id ?? "—"}
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">
        {user.session_timeout ? `${user.session_timeout}s` : "—"}
      </td>
      <td className="px-3 py-2">
        <span
          className={`inline-block border px-2 py-0.5 text-[10px] tracking-widest ${
            user.enabled
              ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
              : "border-[var(--line)] text-zinc-500"
          }`}
        >
          {user.enabled ? "AKTIF" : "NONAKTIF"}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className="btn-zine btn-paper mr-2 px-2.5 py-1.5 text-[10px]"
        >
          {user.enabled ? "MATIKAN" : "AKTIFKAN"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="btn-zine px-2.5 py-1.5 text-[10px]"
        >
          HAPUS
        </button>
      </td>
    </tr>
  );
}

function LogRow({ log }: { log: RadiusLog }) {
  return (
    <tr className="border-b border-[var(--line)]/60 last:border-b-0">
      <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-zinc-500">
        {formatTime(log.created_at)}
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-zinc-300">{log.username || "—"}</td>
      <td className="px-3 py-2 font-mono text-[11px] text-zinc-500">{log.event}</td>
      <td className="px-3 py-2">
        <span className="font-mono text-[10px]" style={{ color: resultTone(log.result) }}>
          {log.result}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{log.nas_ip || "—"}</td>
    </tr>
  );
}

const MIKROTIK_STEPS = [
  "/radius add service=ppp,login address=<IP-SERVER> secret=<RADIUS_SECRET>",
  "/ppp aaa set use-radius=yes accounting=yes",
  "/ppp profile set default use-radius=yes",
  "# VLAN dari Tunnel-Private-Group-Id otomatis dipakai di interface bridge",
];

export function RadiusCenter() {
  return <RadiusDashboard />;
}

function RadiusDashboard() {
  const [query, setQuery] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [framedIp, setFramedIp] = useState("");
  const [vlanId, setVlanId] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState("");
  const [error, setError] = useState<string | null>(null);

  const users = useRadiusUsers();
  const logs = useRadiusLogs();
  const stats = useRadiusStats();
  const create = useCreateRadiusUser();
  const update = useUpdateRadiusUser();
  const remove = useDeleteRadiusUser();

  const filtered = (users.data ?? []).filter((u) =>
    u.username.toLowerCase().includes(query.toLowerCase()),
  );

  function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    create.mutate(
      {
        username: username.trim(),
        password,
        framed_ip: framedIp.trim() || null,
        vlan_id: vlanId.trim() ? Number(vlanId) : null,
        session_timeout: sessionTimeout.trim() ? Number(sessionTimeout) : null,
      },
      {
        onSuccess: () => {
          setUsername("");
          setPassword("");
          setFramedIp("");
          setVlanId("");
          setSessionTimeout("");
        },
        onError: (err: Error) => setError(err.message),
      },
    );
  }

  function toggleUser(user: RadiusUser) {
    setError(null);
    update.mutate(
      { username: user.username, patch: { enabled: !user.enabled } },
      { onError: (err: Error) => setError(err.message) },
    );
  }

  function deleteUser(user: RadiusUser) {
    setError(null);
    remove.mutate(user.username, { onError: (err: Error) => setError(err.message) });
  }

  const busy = update.isPending || remove.isPending;
  const unreachable = users.isError;

  return (
    <EmpireShell
      breadcrumb="RADIUS"
      search={{ value: query, onChange: setQuery, placeholder: "Filter user…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-brush text-3xl text-white sm:text-4xl">
              RADIUS <span className="text-[var(--pink)]">ACCESS</span>
            </h1>
            <p className="mt-1 max-w-xl font-hand text-xl text-zinc-400">
              Otentikasi PPPoE / hotspot untuk MikroTik. Kelola akun di sini; NAS bicara RADIUS
              langsung ke service Rust.
            </p>
          </div>
          <ZineBadge color={unreachable ? "#ff2d78" : "#3ddc84"} dark>
            {users.isLoading ? "MEMERIKSA" : unreachable ? "TERPUTUS" : "TERHUBUNG"}
          </ZineBadge>
        </header>

        {unreachable && (
          <ZineCardRough className="p-6">
            <h2 className="font-brush text-2xl text-[var(--red)]">RADIUS TIDAK TERJANGKAU</h2>
            <p className="mt-2 text-sm text-zinc-400">{(users.error as Error).message}</p>
            <p className="mt-3 text-xs text-zinc-500">
              Pastikan service <code>services/radius</code> berjalan dan <code>RADIUS_URL</code> di
              apps/api benar.
            </p>
          </ZineCardRough>
        )}

        {stats.data && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ZineCard className="p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500">TOTAL USER</p>
              <p className="mt-1 font-brush text-2xl text-white">{stats.data.total_users}</p>
            </ZineCard>
            <ZineCard className="p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500">AKTIF</p>
              <p className="mt-1 font-brush text-2xl text-[var(--green)]">
                {stats.data.enabled_users}
              </p>
            </ZineCard>
            <ZineCard className="p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500">TOTAL LOGIN</p>
              <p className="mt-1 font-brush text-2xl text-white">{stats.data.total_logins}</p>
            </ZineCard>
            <ZineCard className="p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500">REJECT / 24J</p>
              <p className="mt-1 font-brush text-2xl text-[var(--red)]">
                {stats.data.recent_rejects}
              </p>
            </ZineCard>
          </div>
        )}

        <ZineCard className="p-5">
          <h2 className="font-brush text-xl text-white">
            TAMBAH <span className="text-[var(--blue)]">AKUN</span>
          </h2>
          <form onSubmit={addUser} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <ZineInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username PPPoE"
              className="rounded-md px-4 py-2.5 text-sm"
              aria-label="Username"
            />
            <ZineInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="rounded-md px-4 py-2.5 text-sm"
              aria-label="Password"
            />
            <ZineInput
              value={framedIp}
              onChange={(e) => setFramedIp(e.target.value)}
              placeholder="IP statis (opsional)"
              className="rounded-md px-4 py-2.5 text-sm"
              aria-label="Framed IP"
            />
            <ZineInput
              value={vlanId}
              onChange={(e) => setVlanId(e.target.value)}
              placeholder="VLAN (opsional)"
              inputMode="numeric"
              className="rounded-md px-4 py-2.5 text-sm"
              aria-label="VLAN ID"
            />
            <ZineInput
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              placeholder="timeout detik"
              inputMode="numeric"
              className="rounded-md px-4 py-2.5 text-sm"
              aria-label="Session timeout"
            />
            <button
              type="submit"
              disabled={create.isPending}
              className="btn-zine px-5 py-2.5 text-sm"
            >
              {create.isPending ? "MENYIMPAN…" : "TAMBAH"}
            </button>
          </form>
          <p className="mt-2 text-[11px] text-zinc-500">
            Password di-hash Argon2id. VLAN dikirim ke MikroTik sebagai atribut RFC 2868.
          </p>
        </ZineCard>

        <ZineCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b-2 border-[var(--line)] px-4 py-3">
            <h2 className="font-brush text-lg text-white">
              AKUN <span className="text-[var(--pink)]">TERDAFTAR</span>
            </h2>
            <span className="font-mono text-[10px] text-zinc-500">{filtered.length} akun</span>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500">
              {users.isLoading ? "Memuat…" : "Belum ada akun. Tambahkan di atas."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-[9px] tracking-[0.2em] text-zinc-500">
                    <th className="px-3 py-2 font-normal">USERNAME</th>
                    <th className="px-3 py-2 font-normal">FRAMED-IP</th>
                    <th className="px-3 py-2 font-normal">VLAN</th>
                    <th className="px-3 py-2 font-normal">TIMEOUT</th>
                    <th className="px-3 py-2 font-normal">STATUS</th>
                    <th className="px-3 py-2 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      busy={busy}
                      onToggle={() => toggleUser(user)}
                      onDelete={() => deleteUser(user)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ZineCard>

        {error && (
          <p
            role="alert"
            className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-xs text-[var(--red)]"
          >
            {error}
          </p>
        )}

        <ZineCard className="overflow-hidden p-0">
          <div className="border-b-2 border-[var(--line)] px-4 py-3">
            <h2 className="font-brush text-lg text-white">
              LOG <span className="text-[var(--yellow)]">OTENTIKASI</span>
            </h2>
          </div>
          {(logs.data ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500">
              {logs.isLoading ? "Memuat…" : "Belum ada aktivitas."}
            </p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[var(--paper)]">
                  <tr className="border-b border-[var(--line)] text-left text-[9px] tracking-[0.2em] text-zinc-500">
                    <th className="px-3 py-2 font-normal">WAKTU</th>
                    <th className="px-3 py-2 font-normal">USER</th>
                    <th className="px-3 py-2 font-normal">EVENT</th>
                    <th className="px-3 py-2 font-normal">HASIL</th>
                    <th className="px-3 py-2 font-normal">NAS</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs.data ?? []).map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ZineCard>

        <ZineCardRough className="p-5">
          <h2 className="font-brush text-lg text-white">
            SETUP <span className="text-[var(--blue)]">MIKROTIK</span>
          </h2>
          <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-zinc-400">
            <li>1. Daftarkan server ini sebagai RADIUS client di RouterOS:</li>
          </ol>
          <pre className="mt-2 overflow-x-auto border border-[var(--line)] bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
            {MIKROTIK_STEPS.join("\n")}
          </pre>
          <p className="mt-2 text-[11px] text-zinc-500">
            <code>secret</code> harus sama dengan <code>RADIUS_SECRET</code> di service. Port UDP
            1812 (auth) dan 1813 (accounting) harus terbuka dari router ke server ini.
          </p>
        </ZineCardRough>
      </div>
    </EmpireShell>
  );
}