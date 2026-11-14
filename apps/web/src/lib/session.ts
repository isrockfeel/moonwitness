import { useEffect, useState } from "react";

export interface Session {
  identity: string;
  role: string;
  username?: string;
  id?: number;
}

/**
 * Hook: current identity from server-side session
 */
export function useCurrentIdentity(): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch("/api/v1/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setSession({
            identity: data.user.displayName,
            role: data.user.role,
            username: data.user.username,
            id: data.user.id,
          });
        } else {
          setSession(null);
        }
      } catch {
        setSession(null);
      }
    }

    fetchSession();
  }, []);

  useEffect(() => {
    function onSessionChange() {
      fetch("/api/v1/auth/me", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user) {
            setSession({
              identity: data.user.displayName,
              role: data.user.role,
              username: data.user.username,
              id: data.user.id,
            });
          } else {
            setSession(null);
          }
        })
        .catch(() => setSession(null));
    }

    window.addEventListener("mw:session-change", onSessionChange);
    return () => window.removeEventListener("mw:session-change", onSessionChange);
  }, []);

  return session;
}

/**
 * Call after login/logout to notify same-tab listeners.
 */
export function notifySessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mw:session-change"));
  }
}
