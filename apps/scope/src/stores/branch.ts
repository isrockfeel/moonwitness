import { create } from "zustand";

export interface BranchNode {
  name: string;
  is_current: boolean;
  is_protected: boolean;
  last_commit: string;
}

export interface BranchInfo {
  current: string;
  protected: boolean;
  allowed: boolean;
  reason: string;
  ahead: number;
  behind: number;
  upstream: string | null;
  topology: { branches: BranchNode[] };
}

interface BranchState {
  info: BranchInfo | null;
  loading: boolean;
  error: string | null;
  check: () => Promise<void>;
}

export const useBranchStore = create<BranchState>((set) => ({
  info: null,
  loading: false,
  error: null,
  check: async () => {
    set({ loading: true, error: null });
    try {
      const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
      if (!tauri) {
        set({ loading: false });
        return;
      }
      const { invoke } = await import("@tauri-apps/api/core");
      const info = await invoke<BranchInfo>("scope_branch_guard");
      set({ info, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
}));
