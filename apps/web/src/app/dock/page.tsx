import { Suspense } from "react";
import { Dock } from "@/components/dock";

export const metadata = { title: "Dock — Timeline Chronicle" };

export default function DockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          TUNING THE CHRONICLE…
        </div>
      }
    >
      <Dock />
    </Suspense>
  );
}
