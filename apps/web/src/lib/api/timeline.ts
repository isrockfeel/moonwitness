"use client";

import { useQuery } from "@tanstack/react-query";
import type { TimelineEvent, Era, TimelineFilters, TimelineStats } from "@moonwitness/types";

const API_BASE = "/api/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useTimelineEvents(filters: TimelineFilters = {}) {
  const params = new URLSearchParams();
  if (filters.era) params.set("era", filters.era);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));

  return useQuery({
    queryKey: ["timeline", "events", params.toString()],
    queryFn: () =>
      fetchJson<{ data: TimelineEvent[]; total: number }>(`${API_BASE}/timeline/events?${params}`),
    staleTime: 30_000,
  });
}

export function useTimelineEvent(id: string | null) {
  return useQuery({
    queryKey: ["timeline", "event", id],
    queryFn: () => fetchJson<{ data: TimelineEvent }>(`${API_BASE}/timeline/events/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useTimelineStats() {
  return useQuery({
    queryKey: ["timeline", "stats"],
    queryFn: () => fetchJson<{ data: TimelineStats }>(`${API_BASE}/timeline/stats`),
    staleTime: 60_000,
  });
}

export function useTimelineEras() {
  return useQuery({
    queryKey: ["timeline", "eras"],
    queryFn: () => fetchJson<{ data: Era[] }>(`${API_BASE}/timeline/eras`),
    staleTime: 60_000,
  });
}
