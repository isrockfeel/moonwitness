import { create } from "zustand";

export interface CommitEntry {
  sha: string;
  message: string;
  author: string;
  time: string;
}

export interface DailyJournal {
  date: string;
  commits: CommitEntry[];
  gate_runs: { gate: string; outcome: string; duration_ms: number }[];
  summary: string;
}

interface JournalState {
  journal: DailyJournal | null;
  loading: boolean;
  error: string | null;
  load: (repoRoot: string) => Promise<void>;
}

export const useJournalStore = create<JournalState>((set) => ({
  journal: null,
  loading: false,
  error: null,
  load: async (repoRoot: string) => {
    set({ loading: true, error: null });
    try {
      const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
      if (!tauri) {
        set({ loading: false });
        return;
      }
      const { invoke } = await import("@tauri-apps/api/core");
      const journal = await invoke<DailyJournal>("scope_daily_journal", { repoRoot });
      set({ journal, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
}));
