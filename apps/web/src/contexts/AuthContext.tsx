"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCurrentIdentity, type Session } from "@/lib/session";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const currentSession = useCurrentIdentity();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Session state hydrated
    setLoading(false);
  }, [currentSession]);

  function logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mw-session");
      sessionStorage.removeItem("mw-session");
      window.dispatchEvent(new Event("mw:session-change"));
    }
    router.push("/shadow");
  }

  return (
    <AuthContext.Provider
      value={{
        session: currentSession,
        loading,
        isAuthenticated: Boolean(currentSession?.identity),
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

