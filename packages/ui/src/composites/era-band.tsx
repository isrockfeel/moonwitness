import type { ArtKey, Era, EraId } from "@moonwitness/types";
import type { CSSProperties } from "react";
import { ZineImage } from "../primitives/zine-image";

/** Peta era → artwork pita. Milik presentation, bukan data timeline. */
const eraArt: Record<EraId, ArtKey> = {
  origins: "city-shadow",
  neon: "hero-witness",
  fracture: "signal-tunnel",
  rebuilding: "city-shadow",
  expansions: "crew-rooftop",
};

export interface EraBandProps {
  eras: Era[];
  active: EraId | "all";
  onSelect: (era: EraId | "all") => void;
}

/** Pita era terkendali: state penyaring tetap milik app. */
export function EraBand({ eras, active, onSelect }: EraBandProps) {
  return (
    <div className="zine-card-rough overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-5">
        {eras.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(active === e.id ? "all" : e.id)}
            aria-pressed={active === e.id}
            className={`group relative h-28 overflow-hidden border-r border-[var(--line)] text-left last:border-r-0 ${active === e.id ? "ring-2 ring-inset" : ""}`}
            style={active === e.id ? ({ "--tw-ring-color": e.color } as CSSProperties) : undefined}
          >
            <ZineImage
              art={eraArt[e.id]}
              alt=""
              sizes="20vw"
              position="center"
              className={`transition-all duration-300 ${active === e.id ? "" : "grayscale group-hover:grayscale-0"}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-2.5">
              <div className="font-brush text-sm leading-tight" style={{ color: e.color }}>
                {e.name.toUpperCase()}
              </div>
              <div className="text-[9px] text-zinc-400">{e.years}</div>
              <div className="mt-0.5 hidden font-hand text-sm leading-tight text-zinc-300 sm:block">
                {e.tagline}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="relative h-8 border-t border-[var(--line)] bg-[var(--panel-2)]">
        <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-[var(--paper)] via-[var(--pink)] via-40% to-[var(--purple)]" />
        {eras.map((e, i) => (
          <button
            key={e.id}
            onClick={() => onSelect(active === e.id ? "all" : e.id)}
            aria-label={`Filter ${e.name}`}
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--ink)] transition-transform hover:scale-125 after:absolute after:-inset-4 after:content-[""] ${active === e.id ? "scale-125" : ""}`}
            style={{ left: `${10 + i * 20}%`, background: e.color }}
          />
        ))}
      </div>
    </div>
  );
}
