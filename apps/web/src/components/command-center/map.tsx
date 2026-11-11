import type { MapCity } from "@moonwitness/types";
import { WorldMap, ZineCard } from "@moonwitness/ui";
import { GlobeIcon } from "@moonwitness/ui/icons";
import { AtmosphereField } from "@/components/atmosphere";
import { SectionHeading } from "./section-heading";

export interface UniverseMapProps {
  cities: MapCity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UniverseMap({ cities, selectedId, onSelect }: UniverseMapProps) {
  const selected = cities.find((c) => c.id === selectedId);
  return (
    <section aria-labelledby="cc-map-heading" className="scroll-mt-24">
      <SectionHeading
        id="cc-map-heading"
        title="UNIVERSE"
        accent="MAP"
        note={`${cities.length} cities`}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="relative min-w-0">
          <WorldMap cities={cities} selectedId={selectedId} onSelect={onSelect} />
          <AtmosphereField
            variant="map"
            cities={cities}
            className="inset-x-4 top-4 z-[1] h-64 mix-blend-screen opacity-80 sm:h-80"
          />
        </div>
        <ZineCard className="min-w-0 p-4">
          <h3 className="flex items-center gap-2 font-brush text-lg text-white">
            <GlobeIcon className="h-4 w-4 text-[var(--blue)]" />
            CITY DETAIL
          </h3>
          {selected ? (
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-[10px] tracking-wider text-zinc-500">CITY</dt>
                <dd className="font-brush text-2xl text-[var(--pink)]">{selected.city}</dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-wider text-zinc-500">SIGNALS</dt>
                <dd className="text-sm text-zinc-200">{selected.signals}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Pick a node on the map, or use the city list beside it.
            </p>
          )}
        </ZineCard>
      </div>
    </section>
  );
}
