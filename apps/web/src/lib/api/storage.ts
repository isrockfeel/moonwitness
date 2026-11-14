"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/v1";

async function requestXml<T>(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  return text;
}

function parseTag(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    out.push(match[1] ?? "");
  }
  return out;
}

function parseBuckets(xml: string): { name: string; creationDate?: string }[] {
  const blocks = xml.match(/<Bucket>[\s\S]*?<\/Bucket>/g) ?? [];
  return blocks.map((block) => ({
    name: parseTag(block, "Name")[0] ?? "",
    creationDate: parseTag(block, "CreationDate")[0],
  }));
}

function parseObjects(xml: string): {
  key: string;
  etag: string;
  size: number;
  lastModified?: string;
}[] {
  const blocks = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? [];
  return blocks.map((block) => ({
    key: parseTag(block, "Key")[0] ?? "",
    etag: (parseTag(block, "ETag")[0] ?? "").replace(/"/g, ""),
    size: Number(parseTag(block, "Size")[0] ?? "0"),
    lastModified: parseTag(block, "LastModified")[0],
  }));
}

export function useStorageHealth() {
  return useQuery({
    queryKey: ["storage", "health"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/storage/health`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ status: string; service: string; reachable?: boolean }>;
    },
    staleTime: 15_000,
  });
}

export function useStorageBuckets() {
  return useQuery({
    queryKey: ["storage", "buckets"],
    queryFn: async () => {
      const xml = await requestXml(`${API_BASE}/storage/buckets`);
      return parseBuckets(xml);
    },
    staleTime: 30_000,
  });
}

export function useStorageObjects(bucket: string | null, prefix?: string) {
  return useQuery({
    queryKey: ["storage", "objects", bucket, prefix ?? ""],
    enabled: !!bucket,
    queryFn: async () => {
      const params = new URLSearchParams({ "list-type": "2" });
      if (prefix) params.set("prefix", prefix);
      const xml = await requestXml(
        `${API_BASE}/storage/buckets/${encodeURIComponent(bucket!)}/objects?${params}`,
      );
      return parseObjects(xml);
    },
    staleTime: 15_000,
  });
}

export function useCreateBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${API_BASE}/storage/buckets/${encodeURIComponent(name)}`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage", "buckets"] }),
  });
}

export function useDeleteBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${API_BASE}/storage/buckets/${encodeURIComponent(name)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage", "buckets"] }),
  });
}

export function useUploadObject(bucket: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      key,
      body,
      contentType,
    }: {
      key: string;
      body: Blob | ArrayBuffer | string;
      contentType?: string;
    }) => {
      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(
        `${API_BASE}/storage/buckets/${encodeURIComponent(bucket!)}/${encodedKey}`,
        {
          method: "PUT",
          credentials: "include",
          headers: contentType ? { "content-type": contentType } : undefined,
          body: body as BodyInit,
        },
      );
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage", "objects", bucket] }),
  });
}

export function useDeleteObject(bucket: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(
        `${API_BASE}/storage/buckets/${encodeURIComponent(bucket!)}/${encodedKey}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage", "objects", bucket] }),
  });
}

export function storageObjectUrl(bucket: string, key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${API_BASE}/storage/buckets/${encodeURIComponent(bucket)}/${encodedKey}`;
}
