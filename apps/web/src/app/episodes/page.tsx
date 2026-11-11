import { EmpireShell } from "@/components/shell";
import { EpisodesView } from "@/views/episodes";

export const metadata = { title: "Episodes & Pipeline — MoonWitness" };

export default function EpisodesPage() {
  return (
    <EmpireShell breadcrumb="Episodes // Pipeline">
      <div className="px-4 py-8 sm:px-8">
        <EpisodesView />
      </div>
    </EmpireShell>
  );
}
