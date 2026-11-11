"use client";

import { Star4 } from "@moonwitness/ui/icons";
import { EmpireShell } from "@/components/shell";
import { mapCities, modules, projects, quickActions, universeStats } from "@/lib/data";
import { Collections } from "./collections";
import { CommandHero } from "./hero";
import { CrewOrbit } from "./crew";
import { IdeasInMotion } from "./ideas";
import { ItemDrawer } from "./item-drawer";
import { MissionLog } from "./log";
import { ModuleDrawer } from "./module-drawer";
import { Pipeline } from "./pipeline";
import { ProjectUniverse } from "./projects";
import { QuickActions } from "./quick-actions";
import { Studios } from "./studios";
import { UniverseMap } from "./map";
import { UniverseStatus } from "./status";
import { Workspace } from "./workspace";
import { useCommandCenter } from "./use-command-center";

export function CommandCenter() {
  const cc = useCommandCenter();

  return (
    <EmpireShell
      breadcrumb="Shadow Command Center"
      search={{
        value: cc.query,
        onChange: cc.setQuery,
        placeholder: "Search projects, stories, research, or people…",
      }}
    >
      <CommandHero />
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <UniverseStatus stats={universeStats} />
        <QuickActions actions={quickActions} onAction={cc.onAction} />
        <IdeasInMotion />
        <Workspace items={cc.visible.workspace} onOpenItem={cc.onOpenWorkspaceItem} />
        <Pipeline columns={cc.visible.pipeline} onOpenCard={cc.onOpenCard} />
        <Collections collections={cc.visible.collections} onOpenCollection={cc.onOpenCollection} />
        <ProjectUniverse projects={cc.visible.projects} />
        <Studios modules={modules} onOpen={cc.onOpenModule} />
        <UniverseMap cities={mapCities} selectedId={cc.selectedCity} onSelect={cc.setSelectedCity} />
        <CrewOrbit />
        <MissionLog
          feed={cc.visible.feed}
          alerts={cc.alerts}
          workflows={cc.visible.workflows}
          onDismissAlert={cc.onDismissAlert}
          onToggleWorkflow={cc.onToggleWorkflow}
        />
      </div>

      {cc.openModule && (
        <ModuleDrawer
          module={cc.openModule}
          projects={projects}
          onQueue={cc.onQueue}
          onClose={cc.closeOverlays}
        />
      )}
      {cc.detail && <ItemDrawer detail={cc.detail} onClose={cc.closeOverlays} />}

      {cc.toast && (
        <div
          role="status"
          className="sticker sticker-yellow fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-5 py-2.5 font-brush text-sm"
        >
          {cc.toast}
        </div>
      )}

      <Star4 className="pointer-events-none fixed bottom-24 right-6 hidden h-6 w-6 text-[var(--pink)] opacity-50 xl:block" />
    </EmpireShell>
  );
}
