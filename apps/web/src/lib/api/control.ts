"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api/v1/control";

export interface HostCapabilities {
  systemd: boolean;
  docker: boolean;
  files: boolean;
  cron: boolean;
  users: boolean;
  firewall: boolean;
  host_metrics: boolean;
  network: boolean;
  ssh: boolean;
  cert: boolean;
  mount: boolean;
  alert: boolean;
  kubernetes: boolean;
}

export interface HostInfo {
  os: "linux" | "wsl" | "windows" | "darwin" | "unknown";
  arch: string;
  hostname: string;
  kernel?: string;
  distro?: string;
  wsl_distro?: string;
  is_root: boolean;
  capabilities: HostCapabilities;
  notes?: string[];
}

export interface HostMetrics {
  time: string;
  cpu_pct: number;
  load1: number;
  load5: number;
  load15: number;
  mem_total: number;
  mem_used: number;
  mem_pct: number;
  swap_total: number;
  swap_used: number;
  disk_path: string;
  disk_total: number;
  disk_used: number;
  disk_pct: number;
  uptime_sec: number;
  degraded?: boolean;
  notes?: string[];
}

export interface ControlStatus {
  reachable: boolean;
  host: HostInfo;
  metrics: HostMetrics;
}

export interface Observation {
  exists: boolean;
  fields?: Record<string, string>;
  detail?: string;
}

export type ResourceObservations = Record<string, Record<string, Observation> | { error: string }>;

export interface AuditEntry {
  time: string;
  role: string;
  method: string;
  path: string;
  target?: string;
  action?: string;
  plan?: string;
  result: string;
  error?: string;
  remote?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export function useControlStatus() {
  return useQuery({
    queryKey: ["control", "status"],
    queryFn: () => fetchJson<ControlStatus>(`${API_BASE}/status`),
    refetchInterval: 15_000,
    retry: 1,
  });
}

export type ControlResourceKind =
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

export function useControlResources(kind?: ControlResourceKind) {
  const query = kind ? `?kind=${kind}` : "";
  return useQuery({
    queryKey: ["control", "resources", kind ?? "all"],
    queryFn: () => fetchJson<ResourceObservations>(`${API_BASE}/resources${query}`),
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useControlAudit(lines = 25) {
  return useQuery({
    queryKey: ["control", "audit", lines],
    queryFn: () => fetchJson<AuditEntry[]>(`${API_BASE}/audit?lines=${lines}`),
    refetchInterval: 30_000,
    retry: 1,
  });
}
