import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RadioHealth {
  online: boolean;
  latencyMs: number | null;
  listeners: number;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface SignalData {
  frequency: number;
  amplitude: number;
  timestamp: number;
}

interface RadioState {
  health: RadioHealth;
  checking: boolean;
  signal: SignalData[];
  wsConnected: boolean;
  connect: () => Promise<void>;
  check: () => Promise<void>;
  connectWs: () => void;
  disconnectWs: () => void;
}

const RADIO_URL = "https://moonwitness-radio.bjo163.workers.dev";
const WS_URL = "wss://moonwitness-radio.bjo163.workers.dev/ws";

let ws: WebSocket | null = null;

export const useRadioStore = create<RadioState>()(
  persist(
    (set, get) => ({
      health: {
        online: false,
        latencyMs: null,
        listeners: 0,
        lastCheckedAt: null,
        error: null,
      },
      checking: false,
      signal: [],
      wsConnected: false,
      connect: async () => {
        await get().check();
        get().connectWs();
      },
      check: async () => {
        set({ checking: true });
        const started = performance.now();
        try {
          const res = await fetch(`${RADIO_URL}/api/health`, {
            signal: AbortSignal.timeout(5000),
          });
          const latencyMs = Math.round(performance.now() - started);
          const body = (await res.json().catch(() => ({}))) as {
            listeners?: number;
          };
          set({
            checking: false,
            health: {
              online: res.ok,
              latencyMs,
              listeners: body.listeners ?? 0,
              lastCheckedAt: new Date().toISOString(),
              error: res.ok ? null : `HTTP ${res.status}`,
            },
          });
        } catch (err) {
          set({
            checking: false,
            health: {
              online: false,
              latencyMs: null,
              listeners: 0,
              lastCheckedAt: new Date().toISOString(),
              error: String(err),
            },
          });
        }
      },
      connectWs: () => {
        if (ws?.readyState === WebSocket.OPEN) return;
        try {
          ws = new WebSocket(WS_URL);
          ws.onopen = () => set({ wsConnected: true });
          ws.onclose = () => set({ wsConnected: false });
          ws.onerror = () => set({ wsConnected: false });
          ws.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data) as {
                frequency?: number;
                amplitude?: number;
              };
              if (typeof data.frequency === "number") {
                set((s) => ({
                  signal: [
                    ...s.signal.slice(-99),
                    {
                      frequency: data.frequency!,
                      amplitude: data.amplitude ?? 0,
                      timestamp: Date.now(),
                    },
                  ],
                }));
              }
            } catch {
              // ignore malformed messages
            }
          };
        } catch {
          set({ wsConnected: false });
        }
      },
      disconnectWs: () => {
        ws?.close();
        ws = null;
        set({ wsConnected: false });
      },
    }),
    { name: "scope-radio" },
  ),
);
