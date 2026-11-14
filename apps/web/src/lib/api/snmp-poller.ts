"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/v1";

export interface SnmpDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  version: string;
  community: string;
  enabled: boolean;
  created_at: number;
}

export interface SnmpTarget {
  id: string;
  device_id: string;
  name: string;
  oid: string;
  poll_interval: number | null;
  enabled: boolean;
  created_at: number;
}

export interface SnmpSample {
  id: string;
  target_id: string;
  ts: number;
  counter: number;
  rate: number | null;
}

export interface SnmpStats {
  total_devices: number;
  enabled_devices: number;
  total_targets: number;
  total_samples: number;
}

export interface CreateDeviceRequest {
  name: string;
  host: string;
  port?: number;
  version?: string;
  community?: string;
  enabled?: boolean;
}

export interface CreateTargetRequest {
  name: string;
  oid: string;
  poll_interval?: number;
  enabled?: boolean;
}

export interface SampleQuery {
  from?: number;
  to?: number;
  limit?: number;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useSnmpHealth() {
  return useQuery({
    queryKey: ["snmp", "health"],
    queryFn: () =>
      fetchJson<{ status: string; service: string; reachable?: boolean }>(
        `${API_BASE}/snmp/health`,
      ),
    staleTime: 15_000,
  });
}

export function useSnmpDevices() {
  return useQuery({
    queryKey: ["snmp", "devices"],
    queryFn: () => fetchJson<SnmpDevice[]>(`${API_BASE}/snmp/devices`),
    staleTime: 30_000,
  });
}

export function useSnmpDevice(id: string | null) {
  return useQuery({
    queryKey: ["snmp", "device", id],
    queryFn: () => fetchJson<SnmpDevice>(`${API_BASE}/snmp/devices/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useSnmpTargets(deviceId: string | null) {
  return useQuery({
    queryKey: ["snmp", "targets", deviceId ?? ""],
    queryFn: () => fetchJson<SnmpTarget[]>(`${API_BASE}/snmp/devices/${deviceId}/targets`),
    enabled: !!deviceId,
    staleTime: 30_000,
  });
}

export function useSnmpTarget(id: string | null) {
  return useQuery({
    queryKey: ["snmp", "target", id],
    queryFn: () => fetchJson<SnmpTarget>(`${API_BASE}/snmp/targets/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useSnmpSamples(targetId: string | null, query: SampleQuery = {}) {
  return useQuery({
    queryKey: ["snmp", "samples", targetId ?? "", query],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query.from) params.set("from", String(query.from));
      if (query.to) params.set("to", String(query.to));
      if (query.limit) params.set("limit", String(query.limit));
      return fetchJson<SnmpSample[]>(`${API_BASE}/snmp/targets/${targetId}/samples?${params}`);
    },
    enabled: !!targetId,
    staleTime: 10_000,
  });
}

export function useSnmpLatestSample(targetId: string | null) {
  return useQuery({
    queryKey: ["snmp", "latest", targetId ?? ""],
    queryFn: () => fetchJson<SnmpSample>(`${API_BASE}/snmp/targets/${targetId}/latest`),
    enabled: !!targetId,
    staleTime: 5_000,
  });
}

export function useSnmpStats() {
  return useQuery({
    queryKey: ["snmp", "stats"],
    queryFn: () => fetchJson<SnmpStats>(`${API_BASE}/snmp/stats`),
    staleTime: 30_000,
  });
}

export function useCreateSnmpDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDeviceRequest) => {
      const res = await fetch(`${API_BASE}/snmp/devices`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<SnmpDevice>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snmp", "devices"] }),
  });
}

export function useDeleteSnmpDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/snmp/devices/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snmp", "devices"] }),
  });
}

export function useCreateSnmpTarget(deviceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTargetRequest) => {
      const res = await fetch(`${API_BASE}/snmp/devices/${deviceId}/targets`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<SnmpTarget>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snmp", "targets", deviceId] }),
  });
}

export function useDeleteSnmpTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/snmp/targets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snmp", "targets"] }),
  });
}
