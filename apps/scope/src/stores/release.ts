import { create } from "zustand";

export interface ReleaseStatus {
  version: string;
  manifest_version: string | null;
  manifest_drift: boolean;
  changelog_entry: boolean;
  tag_exists: boolean;
  tag_free: boolean;
  ready: boolean;
  blockers: string[];
}

interface ReleaseState {
  status: ReleaseStatus | null;
  loading: boolean;
  error: string | null;
  check: (repoRoot: string) => Promise<void>;
}

export const useReleaseStore = create<ReleaseState>((set) => ({
  status: null,
  loading: false,
  error: null,
  check: async (repoRoot: string) => {
    set({ loading: true, error: null });
    try {
      const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
      if (!tauri) {
        set({ loading: false });
        return;
      }
      const { invoke } = await import("@tauri-apps/api/core");
      const status = await invoke<ReleaseStatus>("scope_release_radar", { repoRoot });
      set({ status, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
}));
