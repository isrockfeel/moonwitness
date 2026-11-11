"use client";

import { useState } from "react";
import { Tape, ZineBadge, ZineCard, ZineCardRough, ZineInput } from "@moonwitness/ui";
import { Crown } from "@moonwitness/ui/icons";
import { EmpireShell } from "@/components/shell";
import { ControlGate } from "@/components/control/gate";
import {
  useCreatePeer,
  useDeletePeer,
  usePeerConfig,
  useVPNDown,
  useVPNStatus,
  useVPNUp,
  type VPNPeer,
} from "@/lib/api/vpn";

function handshakeLabel(epoch?: string): { text: string; live: boolean } {
  if (!epoch) return { text: "belum pernah", live: false };
  const seconds = Number(epoch);
  if (!Number.isFinite(seconds) || seconds <= 0) return { text: "belum pernah", live: false };
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 180) return { text: `${diff}s lalu`, live: true };
  if (diff < 7200) return { text: `${Math.floor(diff / 60)}m lalu`, live: true };
  if (diff < 172800) return { text: `${Math.floor(diff / 3600)}j lalu`, live: false };
  return { text: `${Math.floor(diff / 86400)}h lalu`, live: false };
}

function ConfigPanel({ name, config, onClose }: { name: string; config: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const blob = new Blob([config], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.conf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ZineCardRough className="relative p-5">
      <Tape className="-top-3 left-8 -rotate-3" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-brush text-xl text-white">
          CONFIG <span className="text-[var(--green)]">{name.toUpperCase()}</span>
        </h3>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="btn-zine btn-blue px-3 py-2 text-[11px]">
            {copied ? "TERSALIN" : "SALIN"}
          </button>
          <button type="button" onClick={download} className="btn-zine btn-yellow px-3 py-2 text-[11px]">
            UNDUH .CONF
          </button>
          <button type="button" onClick={onClose} className="btn-zine btn-paper px-3 py-2 text-[11px]">
            TUTUP
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[var(--yellow)]">
        Private key hanya ditampilkan sekarang. Salin sebelum menutup panel ini.
      </p>
      <pre className="mt-3 max-h-80 overflow-auto border border-[var(--line)] bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
        {config}
      </pre>
    </ZineCardRough>
  );
}

function PeerRow({
  peer,
  onShowConfig,
  onDelete,
  busy,
}: {
  peer: VPNPeer;
  onShowConfig: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const hs = handshakeLabel(peer.handshake);
  return (
    <tr className="border-b border-[var(--line)]/60 last:border-b-0">
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-zinc-200">{peer.name}</span>
        <span className="ml-2 text-[10px] tracking-widest text-zinc-600">
          {peer.mode.toUpperCase()}
        </span>
        {peer.extra_cidrs && peer.extra_cidrs.length > 0 && (
          <p className="mt-0.5 font-mono text-[10px] text-zinc-500">{peer.extra_cidrs.join(", ")}</p>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">{peer.address}</td>
      <td className="px-3 py-2">
        <span
          className={`inline-block border px-2 py-0.5 text-[10px] tracking-widest ${
            hs.live
              ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
              : "border-[var(--line)] text-zinc-500"
          }`}
        >
          {hs.text.toUpperCase()}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={onShowConfig}
          className="btn-zine btn-paper mr-2 px-2.5 py-1.5 text-[10px]"
        >
          CONFIG
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

export function NetworkCenter() {
  return (
    <ControlGate>
      <NetworkDashboard />
    </ControlGate>
  );
}

function NetworkDashboard() {
  const [query, setQuery] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [localCIDR, setLocalCIDR] = useState("");
  const [peerName, setPeerName] = useState("");
  const [peerMode, setPeerMode] = useState<"split" | "full" | "site">("split");
  const [peerCIDR, setPeerCIDR] = useState("");
  const [config, setConfig] = useState<{ name: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = useVPNStatus();
  const up = useVPNUp();
  const down = useVPNDown();
  const create = useCreatePeer();
  const remove = useDeletePeer();
  const fetchConfig = usePeerConfig();

  function runEndpointUp() {
    setError(null);
    const cidrs = localCIDR
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    up.mutate(
      { endpoint: endpoint.trim() || undefined, local_cidrs: cidrs },
      { onError: (err: Error) => setError(err.message) },
    );
  }

  function addPeer() {
    setError(null);
    if (!peerName.trim()) {
      setError("Nama peer wajib diisi.");
      return;
    }
    const cidrs = peerCIDR
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (peerMode === "site" && cidrs.length === 0) {
      setError("Mode SITE butuh CIDR LAN, mis. 192.168.10.0/24");
      return;
    }
    create.mutate(
      { name: peerName.trim(), mode: peerMode, extra_cidrs: cidrs },
      {
        onSuccess: (data) => {
          setConfig({ name: data.peer.name, text: data.config });
          setPeerName("");
          setPeerCIDR("");
        },
        onError: (err: Error) => setError(err.message),
      },
    );
  }

  function showConfig(name: string) {
    setError(null);
    fetchConfig.mutate(name, {
      onSuccess: (data) => setConfig({ name: data.peer.name, text: data.config }),
      onError: (err: Error) => setError(err.message),
    });
  }

  function deletePeer(name: string) {
    setError(null);
    remove.mutate(name, { onError: (err: Error) => setError(err.message) });
  }

  const data = status.data;

  return (
    <EmpireShell
      breadcrumb="Network"
      search={{ value: query, onChange: setQuery, placeholder: "Filter peer…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-brush text-3xl text-white sm:text-4xl">
              VPN <span className="text-[var(--pink)]">TUNNEL</span>
            </h1>
            <p className="mt-1 max-w-xl font-hand text-xl text-zinc-400">
              WireGuard di host ini. Tambah perangkat, unduh config, langsung tersambung.
            </p>
          </div>
          <ZineBadge color={data?.enabled ? "#3ddc84" : "#ff2d78"} dark>
            {status.isLoading ? "MEMERIKSA" : data?.enabled ? "AKTIF" : "MATI"}
          </ZineBadge>
        </header>

        {status.isError && (
          <ZineCardRough className="p-6">
            <h2 className="font-brush text-2xl text-[var(--red)]">ARSY TIDAK TERJANGKAU</h2>
            <p className="mt-2 text-sm text-zinc-400">{(status.error as Error).message}</p>
          </ZineCardRough>
        )}

        {data && !data.available && (
          <ZineCardRough className="p-5">
            <h2 className="font-brush text-xl text-[var(--yellow)]">TOOL BELUM ADA</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Host ini belum punya <code>{data.missing_tools?.join(", ")}</code>. Pasang dengan{" "}
              <code>apt install wireguard-tools iproute2 nftables</code> lalu muat ulang halaman.
            </p>
          </ZineCardRough>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ZineCard className="p-4">
                <p className="text-[10px] tracking-[0.2em] text-zinc-500">INTERFACE</p>
                <p className="mt-1 font-brush text-2xl text-white">{data.interface}</p>
                <p className="mt-1 font-mono text-[11px] text-zinc-400">{data.address}</p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  udp/{data.listen_port}
                </p>
              </ZineCard>
              <ZineCard className="p-4">
                <p className="text-[10px] tracking-[0.2em] text-zinc-500">ENDPOINT</p>
                <p className="mt-1 truncate font-mono text-sm text-zinc-200">
                  {data.endpoint || "—"}
                </p>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Alamat yang dipakai PC untuk menyambung.
                </p>
              </ZineCard>
              <ZineCard className="p-4">
                <p className="text-[10px] tracking-[0.2em] text-zinc-500">PUBLIC KEY</p>
                <p className="mt-1 truncate font-mono text-[11px] text-zinc-300">
                  {data.public_key || "belum dibuat"}
                </p>
                <p className="mt-2 text-[11px] text-zinc-500">{data.peer_count} peer terdaftar</p>
              </ZineCard>
            </div>

            {!data.enabled && (
              <ZineCard className="p-5">
                <h2 className="font-brush text-xl text-white">
                  AKTIFKAN <span className="text-[var(--pink)]">TUNNEL</span>
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Isi domain/IP publik VPS agar config PC bisa dibuat. Port default 51820/udp.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <ZineInput
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="vps.contoh.id:51820"
                    className="rounded-md px-4 py-2.5 text-sm"
                    aria-label="Endpoint publik"
                  />
                  <ZineInput
                    value={localCIDR}
                    onChange={(e) => setLocalCIDR(e.target.value)}
                    placeholder="LAN server (opsional) 10.20.0.0/24"
                    className="rounded-md px-4 py-2.5 text-sm"
                    aria-label="CIDR LAN server"
                  />
                  <button
                    type="button"
                    onClick={runEndpointUp}
                    disabled={up.isPending}
                    className="btn-zine shrink-0 px-5 py-2.5 text-sm"
                  >
                    {up.isPending ? "MENYALAKAN…" : "AKTIFKAN"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Port <code>udp/{data.listen_port}</code> dibuka otomatis di firewall host
                  {data.manage_firewall ? "" : " (manajemen firewall dimatikan)"}.
                </p>
              </ZineCard>
            )}

            {data.enabled && (
              <>
                <ZineCard className="p-5">
                  <h2 className="font-brush text-xl text-white">
                    TAMBAH <span className="text-[var(--blue)]">PERANGKAT</span>
                  </h2>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <ZineInput
                      value={peerName}
                      onChange={(e) => setPeerName(e.target.value)}
                      placeholder="pc-rumah"
                      className="rounded-md px-4 py-2.5 text-sm"
                      aria-label="Nama perangkat"
                    />
                    <div className="flex gap-1">
                      {(["split", "full", "site"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPeerMode(mode)}
                          aria-pressed={peerMode === mode}
                          className={`border px-3 py-2 text-[10px] tracking-widest ${
                            peerMode === mode
                              ? "border-[var(--pink)] bg-[var(--pink)]/15 text-[var(--pink)]"
                              : "border-[var(--line)] text-zinc-500"
                          }`}
                        >
                          {mode.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addPeer}
                      disabled={create.isPending}
                      className="btn-zine px-5 py-2.5 text-sm"
                    >
                      {create.isPending ? "MEMBUAT…" : "TAMBAH"}
                    </button>
                  </div>
                  {peerMode === "site" && (
                    <div className="mt-2">
                      <ZineInput
                        value={peerCIDR}
                        onChange={(e) => setPeerCIDR(e.target.value)}
                        placeholder="LAN di balik router, mis. 192.168.10.0/24"
                        className="rounded-md px-4 py-2.5 text-sm"
                        aria-label="CIDR LAN peer site"
                      />
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-zinc-500">
                    <strong className="text-zinc-300">SPLIT</strong> hanya subnet VPN — internet tetap
                    lewat ISP. <strong className="text-zinc-300">FULL</strong> semua trafik lewat VPS.{" "}
                    <strong className="text-zinc-300">SITE</strong> untuk router kantor: LAN di balik
                    router ikut terhubung.
                  </p>
                </ZineCard>

                <ZineCard className="overflow-hidden p-0">
                  <div className="flex items-center justify-between border-b-2 border-[var(--line)] px-4 py-3">
                    <h2 className="font-brush text-lg text-white">
                      PERANGKAT <span className="text-[var(--pink)]">TERDAFTAR</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => down.mutate(undefined, { onError: (e: Error) => setError(e.message) })}
                      disabled={down.isPending}
                      className="btn-zine btn-paper px-3 py-2 text-[10px]"
                    >
                      MATIKAN TUNNEL
                    </button>
                  </div>
                  {data.peers.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-zinc-500">
                      Belum ada perangkat. Tambahkan PC Anda di atas.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--line)] text-left text-[9px] tracking-[0.2em] text-zinc-500">
                            <th className="px-3 py-2 font-normal">NAMA</th>
                            <th className="px-3 py-2 font-normal">ALAMAT</th>
                            <th className="px-3 py-2 font-normal">HANDSHAKE</th>
                            <th className="px-3 py-2 font-normal" />
                          </tr>
                        </thead>
                        <tbody>
                          {data.peers.map((peer) => (
                            <PeerRow
                              key={peer.id}
                              peer={peer}
                              busy={remove.isPending}
                              onShowConfig={() => showConfig(peer.name)}
                              onDelete={() => deletePeer(peer.name)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ZineCard>
              </>
            )}

            {error && (
              <p
                role="alert"
                className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-xs text-[var(--red)]"
              >
                {error}
              </p>
            )}

            {config && (
              <ConfigPanel name={config.name} config={config.text} onClose={() => setConfig(null)} />
            )}

            <ZineCardRough className="p-5">
              <h2 className="font-brush text-lg text-white">
                CARA <span className="text-[var(--yellow)]">SAMBUNG</span>
              </h2>
              <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-zinc-400">
                <li>1. Unduh file <code>.conf</code> di atas.</li>
                <li>2. Pasang aplikasi WireGuard resmi di PC (Windows/macOS/Linux/Android/iOS).</li>
                <li>3. Impor file tersebut, lalu aktifkan tunnel.</li>
                <li>
                  4. Cek dari PC: <code>ping {data.address.split("/")[0]}</code> — balasan berarti
                  tunnel hidup.
                </li>
                <li>
                  5. Pastikan port <code>udp/{data.listen_port}</code> terbuka di firewall VPS.
                </li>
              </ol>
              <p className="mt-3 flex items-center gap-1.5 text-[10px] tracking-wider text-zinc-600">
                <Crown className="h-3 w-5 text-[var(--yellow)]" />
                PRIVATE KEY TIDAK PERNAH DISIMPAN DI BROWSER
              </p>
            </ZineCardRough>
          </>
        )}
      </div>
    </EmpireShell>
  );
}
