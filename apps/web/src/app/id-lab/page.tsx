import { Suspense } from "react";
import { IdLab } from "@/components/id-lab";

export const metadata = { title: "ID Lab — Witness Avatar Forge" };

export default function IdLabPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          MIXING THE INK…
        </div>
      }
    >
      <IdLab />
    </Suspense>
  );
}
