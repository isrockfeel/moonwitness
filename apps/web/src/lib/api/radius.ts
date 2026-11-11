"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/v1/radius";

export interface RadiusUser {
  id: string;
  username: string;
  enabled: boolean;
  framed_ip: string | null;
  vlan_id: number | null;
  session_timeout: number | null;
  mac_address: string | null;
}

export interface RadiusLog {
  id: string;
  username: string;
  nas_ip: string | null;
  nas_port: string | null;
  event: string;
  result: string;
  framed_ip: string | null;
  vlan_id: number | null;
  created_at: number;
}

export interface RadiusStats {
  total_users: number;
  enabled_users: number;
  total_logins: number;
  recent_rejects: number;
}

export interface CreateUserInput {
  username: string;
  password: string;
  enabled?: boolean;
  framed_ip?: string | null;
  vlan_id?: number | null;
  session_timeout?: number | null;
  mac_address?: string | null;
}

export interface UpdateUserInput {
  password?: string;
  enabled?: boolean;
  framed_ip?: string | null;
  vlan_id?: number | null;
  session_timeout?: number | null;
  mac_address?: string | null;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export function useRadiusUsers() {
  return useQuery({
    queryKey: ["radius", "users"],
    queryFn: () => requestJson<RadiusUser[]>(`${API_BASE}/users`),
    refetchInterval: 20_000,
    retry: 1,
  });
}

export function useRadiusLogs(limit = 50) {
  return useQuery({
    queryKey: ["radius", "logs", limit],
    queryFn: () => requestJson<RadiusLog[]>(`${API_BASE}/logs?limit=${limit}`),
    refetchInterval: 20_000,
    retry: 1,
  });
}

export function useRadiusStats() {
  return useQuery({
    queryKey: ["radius", "stats"],
    queryFn: () => requestJson<RadiusStats>(`${API_BASE}/stats`),
    refetchInterval: 20_000,
    retry: 1,
  });
}

export function useCreateRadiusUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      requestJson<RadiusUser>(`${API_BASE}/users`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["radius"] }),
  });
}

export function useUpdateRadiusUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, patch }: { username: string; patch: UpdateUserInput }) =>
      requestJson<RadiusUser>(`${API_BASE}/users/${encodeURIComponent(username)}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["radius"] }),
  });
}

export function useDeleteRadiusUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      requestJson<void>(`${API_BASE}/users/${encodeURIComponent(username)}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["radius"] }),
  });
}