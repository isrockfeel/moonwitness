"use client";

import { useState } from "react";
import { EmpireShell } from "@/components/shell";
import { UniverseMap } from "@/components/command-center/map";
import { mapCities } from "@/lib/data";
import { DistressedSticker } from "@moonwitness/ui";

export default function ResearchPage() {
  const [selectedCity, setSelectedCity] = useState<string | null>("tokyo");

  return (
    <EmpireShell
      breadcrumb="Research // Telemetry Map"
      search={{
        value: "",
        onChange: () => {},
        placeholder: "Search coordinates, cities, or sensor nodes…",
      }}
    >
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker
              variant="hazard"
              text="NOCTURNAL SURVEILLANCE RADAR"
              className="mb-2"
            />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              RESEARCH <span className="text-[var(--blue)]">& TELEMETRY</span>
            </h1>
          </div>
          <DistressedSticker variant="barcode" code="GEO-GRID-77" />
        </div>

        <div className="max-w-4xl">
          <UniverseMap cities={mapCities} selectedId={selectedCity} onSelect={setSelectedCity} />
        </div>
      </div>
    </EmpireShell>
  );
}
