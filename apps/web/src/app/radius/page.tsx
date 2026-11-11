import { Suspense } from "react";
import { RadiusView } from "@/views/radius";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata = {
  title: "RADIUS Access — MoonWitness Underground",
  description: "Otentikasi PPPoE / hotspot MikroTik lewat RADIUS server.",
};

export default function RadiusPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
            MENGHUBUNGKAN RADIUS…
          </div>
        }
      >
        <RadiusView />
      </Suspense>
    </AuthGuard>
  );
}