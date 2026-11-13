"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const APP_AUTH_BASE = "/api/v1/auth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "editor" | "viewer";
  active: boolean;
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
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return body as T;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["app", "auth", "me"],
    queryFn: () => requestJson<{ user: AuthUser }>(`${APP_AUTH_BASE}/me`),
    retry: false,
    staleTime: 30_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      requestJson<{ user: AuthUser }>(`${APP_AUTH_BASE}/login`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestJson<{ ok: boolean }>(`${APP_AUTH_BASE}/logout`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app"] });
    },
  });
}
