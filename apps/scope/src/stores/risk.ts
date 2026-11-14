import { create } from "zustand";

export interface DirtyPackage {
  name: string;
  path: string;
  changed_files: number;
}

export interface StalePackage {
  name: string;
  path: string;
  days_since_change: number;
}

export interface RiskMap {
  dirty_packages: DirtyPackage[];
  stale_packages: StalePackage[];
  migration_status: { total: number; applied: number; pending: number };
  env_drift: { has_schema: boolean; has_example: boolean; drift: boolean };
}

interface RiskState {
  map: RiskMap | null;
  loading: boolean;
  error: string | null;
  check: (repoRoot: string) => Promise<void>;
}

export const useRiskStore = create<RiskState>((set) => ({
  map: null,
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
      const map = await invoke<RiskMap>("scope_risk_map", { repoRoot });
      set({ map, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
}));
