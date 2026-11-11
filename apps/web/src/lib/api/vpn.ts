"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/v1/control";

export interface VPNPeer {
  id: string;
  name: string;
  public_key: string;
  address: string;
  subnet?: string;
  mode: "split" | "full" | "site";
  extra_cidrs?: string[];
  enabled: boolean;
  keepalive: number;
  created_at: string;
  handshake?: string;
  rx_bytes: number;
  tx_bytes: number;
  quota_bytes?: number;
  quota_blocked?: boolean;
}

export interface VPNSubnet {
  name: string;
  address: string;
  cidr: string;
}

export interface VPNStatus {
  enabled: boolean;
  interface: string;
  address: string;
  listen_port: number;
  endpoint: string;
  local_cidrs?: string[];
  manage_firewall: boolean;
  public_key: string;
  server_configured: boolean;
  peer_count: number;
  peers: VPNPeer[];
  subnets?: VPNSubnet[];
  available: boolean;
  missing_tools?: string[];
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export function useVPNStatus() {
  return useQuery({
    queryKey: ["control", "vpn", "status"],
    queryFn: () => requestJson<VPNStatus>(`${API_BASE}/vpn/status`),
    refetchInterval: 20_000,
    retry: 1,
  });
}

export function useVPNUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      endpoint?: string;
      listen_port?: number;
      local_cidrs?: string[];
      manage_firewall?: boolean;
    }) =>
      requestJson<{ enabled: boolean; public_key: string }>(`${API_BASE}/vpn/up`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["control", "vpn"] }),
  });
}

export function useVPNDown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestJson<{ enabled: boolean }>(`${API_BASE}/vpn/down`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["control", "vpn"] }),
  });
}

export function useCreatePeer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      mode: "split" | "full" | "site";
      extra_cidrs?: string[];
      subnet?: string;
    }) =>
      requestJson<{ peer: VPNPeer; config: string }>(`${API_BASE}/vpn/peers`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["control", "vpn"] }),
  });
}

export function useSetPeerQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; quota_bytes: number }) =>
      requestJson<{ peer: VPNPeer }>(
        `${API_BASE}/vpn/peers/${encodeURIComponent(input.name)}/quota`,
        { method: "POST", body: JSON.stringify({ quota_bytes: input.quota_bytes }) },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["control", "vpn"] }),
  });
}

export function useDeletePeer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      requestJson<{ ok: boolean }>(`${API_BASE}/vpn/peers/${encodeURIComponent(name)}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["control", "vpn"] }),
  });
}

export function usePeerConfig() {
  return useMutation({
    mutationFn: (name: string) =>
      requestJson<{ peer: VPNPeer; config: string }>(
        `${API_BASE}/vpn/peers/${encodeURIComponent(name)}/config`,
      ),
  });
}
