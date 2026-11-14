import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WorkspaceState {
  root: string | null;
  branch: string | null;
  dirty: boolean;
  ahead: number;
  behind: number;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      root: null,
      branch: null,
      dirty: false,
      ahead: 0,
      behind: 0,
      loading: false,
      error: null,
      load: async () => {
        set({ loading: true, error: null });
        try {
          // In Tauri, this calls the Rust command `scope_git_status`.
          // In browser dev, fall back to a no-op so the UI still renders.
          const api = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
          if (!api) {
            set({ loading: false });
            return;
          }
          const { invoke } = await import("@tauri-apps/api/core");
          const status = await invoke<{
            root: string;
            branch: string;
            dirty: boolean;
            ahead: number;
            behind: number;
          }>("scope_git_status");
          set({ ...status, loading: false });
        } catch (err) {
          set({ error: String(err), loading: false });
        }
      },
    }),
    { name: "scope-workspace" },
  ),
);
