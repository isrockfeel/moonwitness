import { Suspense } from "react";
import { DashboardView } from "@/views/dashboard";

export const metadata = { title: "Mission Control — MoonWitness" };

export default function MissionControlPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          LOADING MISSION CONTROL…
        </div>
      }
    >
      <DashboardView />
    </Suspense>
  );
}
