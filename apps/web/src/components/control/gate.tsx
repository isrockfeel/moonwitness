"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ZineCardRough } from "@moonwitness/ui";
import { useCurrentUser, useSetupStatus } from "@/lib/api/onboarding";
import { ControlLogin } from "./login";

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 font-brush text-2xl text-[var(--pink)]">
      {children}
    </div>
  );
}

function RedirectToSetup() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/setup");
  }, [router]);
  return <FullScreen>MEMBUKA SETUP…</FullScreen>;
}

/**
 * ControlGate memastikan urutan yang sama untuk semua halaman control:
 * belum initialized → /setup, belum login → form login, sudah login → isi.
 */
export function ControlGate({ children }: { children: ReactNode }) {
  const setup = useSetupStatus();
  const me = useCurrentUser();

  if (setup.isLoading) return <FullScreen>MEMERIKSA INSTANCE…</FullScreen>;

  if (setup.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ZineCardRough className="max-w-lg p-6">
          <h1 className="font-brush text-2xl text-[var(--red)]">ARSY TIDAK TERJANGKAU</h1>
          <p className="mt-2 text-sm text-zinc-400">{(setup.error as Error).message}</p>
          <p className="mt-3 text-xs text-zinc-500">
            Pastikan <code>arsy serve</code> berjalan dan <code>ARSY_URL</code> di apps/api benar.
          </p>
        </ZineCardRough>
      </div>
    );
  }

  if (!setup.data?.initialized) return <RedirectToSetup />;

  if (me.isLoading) return <FullScreen>MEMBUKA SESI…</FullScreen>;

  if (me.isError) return <ControlLogin instanceName={setup.data.instance.name} />;

  return <>{children}</>;
}
