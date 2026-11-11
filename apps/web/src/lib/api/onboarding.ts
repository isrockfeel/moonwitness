"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/v1/control";

export interface SetupInstance {
  id: string;
  name: string;
  initialized_at?: string;
  version: string;
}

export interface SetupStatus {
  initialized: boolean;
  version: string;
  instance: SetupInstance;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "readonly";
  created_at: string;
  last_login_at?: string;
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

export function useSetupStatus() {
  return useQuery({
    queryKey: ["control", "setup", "status"],
    queryFn: () => requestJson<SetupStatus>(`${API_BASE}/setup/status`),
    retry: 1,
    staleTime: 10_000,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["control", "auth", "me"],
    queryFn: () => requestJson<{ user: AuthUser }>(`${API_BASE}/auth/me`),
    retry: false,
    staleTime: 30_000,
  });
}

export interface SuperuserInput {
  name: string;
  email: string;
  password: string;
  instanceName: string;
}

export function useCreateSuperuser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SuperuserInput) =>
      requestJson<{ user: AuthUser; initialized: boolean }>(`${API_BASE}/setup/superuser`, {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          password: input.password,
          instance_name: input.instanceName,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["control", "setup"] });
      queryClient.invalidateQueries({ queryKey: ["control", "auth"] });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      requestJson<{ user: AuthUser }>(`${API_BASE}/auth/login`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["control"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestJson<{ ok: boolean }>(`${API_BASE}/auth/logout`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["control"] });
    },
  });
}
