import { Suspense } from "react";
import { PaasView } from "@/views/paas";

export const metadata = {
  title: "PaaS Command Plane — MoonWitness Arsy",
  description: "Centralized PaaS control center for instances, services, deployments, and edge clusters.",
};

export default function PaasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          INITIALIZING PAAS PLATFORM ENGINE…
        </div>
      }
    >
      <PaasView />
    </Suspense>
  );
}
