"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api/v1";

export interface SyslogMessage {
  id: string;
  received_at: number;
  source_ip: string | null;
  transport: string;
  facility: number | null;
  severity: number | null;
  priority: number | null;
  timestamp: string | null;
  hostname: string | null;
  app_name: string | null;
  procid: string | null;
  msgid: string | null;
  message: string;
  raw: string;
}

export interface SyslogStats {
  total_messages: number;
  by_severity: { severity: number | null; count: number }[];
  recent_sources: string[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useSyslogHealth() {
  return useQuery({
    queryKey: ["syslog", "health"],
    queryFn: () =>
      fetchJson<{ status: string; service: string; reachable?: boolean }>(
        `${API_BASE}/syslog/health`,
      ),
    staleTime: 15_000,
  });
}

export interface SyslogMessageFilters {
  limit?: number;
  severity?: number;
  hostname?: string;
  app_name?: string;
  q?: string;
}

export function useSyslogMessages(filters: SyslogMessageFilters = {}) {
  const params = new URLSearchParams();
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.severity !== undefined) params.set("severity", String(filters.severity));
  if (filters.hostname) params.set("hostname", filters.hostname);
  if (filters.app_name) params.set("app_name", filters.app_name);
  if (filters.q) params.set("q", filters.q);

  return useQuery({
    queryKey: ["syslog", "messages", params.toString()],
    queryFn: () => fetchJson<SyslogMessage[]>(`${API_BASE}/syslog/messages?${params}`),
    staleTime: 10_000,
  });
}

export function useSyslogMessage(id: string | null) {
  return useQuery({
    queryKey: ["syslog", "message", id],
    queryFn: () => fetchJson<SyslogMessage>(`${API_BASE}/syslog/messages/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useSyslogStats() {
  return useQuery({
    queryKey: ["syslog", "stats"],
    queryFn: () => fetchJson<SyslogStats>(`${API_BASE}/syslog/stats`),
    staleTime: 15_000,
  });
}
