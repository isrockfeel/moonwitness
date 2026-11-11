"use client";

import { Halftone } from "../primitives/texture";
import { ZineCardRough } from "../primitives/zine-card";

export interface MapCityItem {
  id: string;
  city: string;
  x: number;
  y: number;
  signals: number;
}

export interface WorldMapProps<T extends MapCityItem = MapCityItem> {
  cities: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Peta sinyal stylized: bukan proyeksi geografis, hanya posisi relatif dari data. */
export function WorldMap<T extends MapCityItem>({
  cities,
  selectedId,
  onSelect,
}: WorldMapProps<T>) {
  return (
    <ZineCardRough className="relative overflow-hidden p-4">
      <Halftone className="absolute inset-0 opacity-30" />
      <svg
        viewBox="0 0 100 80"
        className="relative h-64 w-full sm:h-80"
        role="group"
        aria-label="Universe map"
      >
        {cities.map((a, i) =>
          cities
            .slice(i + 1)
            .map((b) => (
              <line
                key={`${a.id}-${b.id}`}
                x1={a.x}
                y1={a.y * 0.8}
                x2={b.x}
                y2={b.y * 0.8}
                stroke={i % 2 ? "#ff2d78" : "#2ea8ff"}
                strokeWidth="0.18"
                strokeDasharray="1.2 1.6"
                opacity="0.4"
              />
            )),
        )}
        {cities.map((c) => (
          <circle
            key={c.id}
            cx={c.x}
            cy={c.y * 0.8}
            r={selectedId === c.id ? 2.2 : 1.3}
            fill={selectedId === c.id ? "#ffd21f" : "#ff2d78"}
            className="pulse-dot"
            style={{ animationDelay: `${c.x * 20}ms` }}
          />
        ))}
      </svg>
      <ul className="relative mt-3 flex flex-wrap gap-2">
        {cities.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              aria-pressed={selectedId === c.id}
              className={`zine-card min-h-11 px-3 py-2 text-[11px] tracking-widest transition-colors ${
                selectedId === c.id
                  ? "border-[var(--yellow)] bg-[var(--yellow)] text-black"
                  : "text-zinc-300 hover:border-[var(--pink)] hover:text-[var(--pink)]"
              }`}
            >
              {c.city}
              <span className="ml-2 text-[10px] text-zinc-500">{c.signals}</span>
            </button>
          </li>
        ))}
      </ul>
    </ZineCardRough>
  );
}
