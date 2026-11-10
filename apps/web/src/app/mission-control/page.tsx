import { Suspense } from "react";
import { MissionControl } from "@/components/mission-control";

export const metadata = { title: "Mission Control" };

export default function MissionControlPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          LOADING THE EMPIRE…
        </div>
      }
    >
      <MissionControl />
    </Suspense>
  );
}
