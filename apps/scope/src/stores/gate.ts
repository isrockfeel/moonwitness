import { create } from "zustand";

export interface GateStep {
  state: string;
  step: string;
  detail: string;
}

export interface GateResult {
  gate: string;
  passed: boolean;
  exit_code: number;
  duration_ms: number;
  steps: GateStep[];
}

interface GateState {
  running: boolean;
  result: GateResult | null;
  events: string[];
  error: string | null;
  run: (gate: string, repoRoot: string) => Promise<void>;
}

export const useGateStore = create<GateState>((set) => ({
  running: false,
  result: null,
  events: [],
  error: null,
  run: async (gate: string, repoRoot: string) => {
    set({ running: true, result: null, events: [], error: null });
    try {
      const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
      if (!tauri) {
        set({ error: "Tauri not available (running in browser?)", running: false });
        return;
      }
      const { invoke } = await import("@tauri-apps/api/core");
      const { listen } = await import("@tauri-apps/api/event");

      // Stream live events.
      const unlisten = await listen<{ kind: string; line: string }>("gate:event", (e) => {
        set((s) => ({ events: [...s.events, e.payload.line] }));
      });

      const result = await invoke<GateResult>("scope_run_gate", { gate, repoRoot });
      unlisten();
      set({ result, running: false });
    } catch (err) {
      set({ error: String(err), running: false });
    }
  },
}));
