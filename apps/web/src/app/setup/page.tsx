import { Suspense } from "react";
import { Onboarding } from "@/components/onboarding";

export const metadata = { title: "Setup — Arsy Control Plane" };

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          MEMERIKSA INSTANCE…
        </div>
      }
    >
      <Onboarding />
    </Suspense>
  );
}
