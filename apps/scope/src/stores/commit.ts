import { create } from "zustand";

export interface ParsedCommit {
  type: string;
  scope: string | null;
  breaking: boolean;
  subject: string;
}

export interface CommitValidation {
  valid: boolean;
  problems: string[];
  parsed: ParsedCommit | null;
}

interface CommitState {
  message: string;
  validation: CommitValidation | null;
  suggestion: string | null;
  setMessage: (msg: string) => void;
  validate: () => Promise<void>;
  suggest: (repoRoot: string) => Promise<void>;
}

export const useCommitStore = create<CommitState>((set, get) => ({
  message: "",
  validation: null,
  suggestion: null,
  setMessage: (msg) => set({ message: msg, validation: null }),
  validate: async () => {
    const { message } = get();
    if (!message.trim()) {
      set({ validation: null });
      return;
    }
    try {
      const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
      if (!tauri) return;
      const { invoke } = await import("@tauri-apps/api/core");
      const validation = await invoke<CommitValidation>("scope_validate_commit", {
        message,
      });
      set({ validation });
    } catch {
      // ignore in browser
    }
  },
  suggest: async (repoRoot: string) => {
    try {
      const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
      if (!tauri) return;
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<{ scope: string; packages: string[] }>("scope_suggest_scope", {
        repoRoot,
      });
      set({ suggestion: result.scope });
    } catch {
      // ignore in browser
    }
  },
}));
