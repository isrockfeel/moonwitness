import { useEffect, useState } from "react";

const SESSION_KEY = "mw-session";
const SESSION_CHANGE_EVENT = "mw:session-change";

export interface Session {
  identity: string;
  role: string;
  username?: string;
}

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") continue;
      const s = parsed as Record<string, unknown>;
      if (typeof s.identity !== "string") continue;
      return { identity: s.identity, role: typeof s.role === "string" ? s.role : "" };
    } catch {
      // ignore malformed entry, try next store
    }
  }
  return null;
}

/**
 * Hook: current demo identity, synced across tabs via storage events
 * and within the same tab via a custom event.
 */
export function useCurrentIdentity(): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Cross-tab sync
    function onStorage(e: StorageEvent) {
      if (e.key !== SESSION_KEY) return;
      setSession(readSession());
    }
    window.addEventListener("storage", onStorage);

    // Same-tab sync via custom event
    function onSessionChange() {
      setSession(readSession());
    }
    window.addEventListener(SESSION_CHANGE_EVENT, onSessionChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SESSION_CHANGE_EVENT, onSessionChange);
    };
  }, []);

  return session;
}

/**
 * Call after setting mw-session to notify same-tab listeners.
 */
export function notifySessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT));
  }
}
