"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/v1/control";

export interface PortForward {
  proto: "tcp" | "udp";
  port: string;
  from?: string;
  to: string;
  key: string;
  active: boolean;
}

export interface PortForwardInput {
  port: string;
  proto: "tcp" | "udp";
  to: string;
  from?: string;
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

export function usePortForwards() {
  return useQuery({
    queryKey: ["control", "portforwards"],
    queryFn: () => requestJson<{ forwards: PortForward[] }>(`${API_BASE}/portforwards`),
    refetchInterval: 20_000,
    retry: 1,
  });
}

export function useCreatePortForward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PortForwardInput) =>
      requestJson<{ forward: PortForward }>(`${API_BASE}/portforwards`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["control", "portforwards"] }),
  });
}

export function useDeletePortForward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      requestJson<{ ok: boolean }>(`${API_BASE}/portforwards?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["control", "portforwards"] }),
  });
}
