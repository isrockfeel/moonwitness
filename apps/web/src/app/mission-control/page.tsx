import { Suspense } from "react";
import { CommandCenter } from "@/components/command-center";

export const metadata = { title: "Shadow Command Center" };

export default function MissionControlPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          LOADING THE EMPIRE…
        </div>
      }
    >
      <CommandCenter />
    </Suspense>
  );
}
