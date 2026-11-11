"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { DistressedSticker, TactileTape, ZineButton } from "@moonwitness/ui";
import { SkullCrossbonesFunky } from "@moonwitness/ui/icons";

interface AuthGuardProps {
  children: ReactNode;
  fallbackUrl?: string;
}

export function AuthGuard({ children, fallbackUrl = "/shadow" }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-mono text-xs text-[var(--pink)]">
        VERIFYING BIOMETRIC SEED // AUTH-CHANNEL...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto my-12 max-w-lg p-6">
        <div className="zine-card-rough relative p-8 text-center bg-black/90 border-2 border-[var(--red)]">
          <TactileTape variant="black" className="-top-3 left-10 -rotate-3" />
          <TactileTape variant="yellow" className="-top-3 right-10 rotate-3" />

          <div className="flex justify-center mb-4 text-[var(--red)]">
            <SkullCrossbonesFunky className="h-16 w-16" />
          </div>

          <DistressedSticker variant="classified" text="SECURITY VIOLATION" className="mb-3" />

          <h2 className="font-brush text-2xl text-white mb-2 tracking-wide">
            {t.auth.unauthorizedTitle}
          </h2>

          <p className="font-mono text-xs text-zinc-400 mb-6 leading-relaxed">
            {t.auth.unauthorizedDesc}
          </p>

          <div className="flex flex-col gap-3">
            <ZineButton
              tone="yellow"
              onClick={() => router.push(fallbackUrl)}
              className="w-full py-3 text-sm font-bold tracking-wider"
            >
              {t.actions.enter}
            </ZineButton>

            <ZineButton
              tone="paper"
              onClick={() => router.push("/dock")}
              className="w-full py-2.5 text-xs font-mono"
            >
              {t.auth.backToSafety}
            </ZineButton>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

