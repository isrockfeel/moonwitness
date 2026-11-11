"use client";

import type { Collection } from "@moonwitness/types";
import { ZineCard } from "../primitives/zine-card";
import { ZineImage } from "../primitives/zine-image";

export interface CollectionsGridProps {
  collections: Collection[];
  onOpenCollection: (id: string) => void;
}

export function CollectionsGrid({ collections, onOpenCollection }: CollectionsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {collections.map((collection) => (
        <button
          key={collection.id}
          type="button"
          onClick={() => onOpenCollection(collection.id)}
          className="text-left"
        >
          <ZineCard className="group overflow-hidden transition-transform hover:-translate-y-1">
            <span className="relative block h-28 overflow-hidden">
              <ZineImage
                art={collection.cover}
                alt=""
                sizes="(max-width: 1279px) 50vw, 25vw"
                className="grayscale transition-all duration-500 group-hover:grayscale-0"
              />
            </span>
            <span className="block p-3">
              <span className="block font-brush text-sm leading-tight text-white group-hover:text-[var(--pink)]">
                {collection.name}
              </span>
              <span className="mt-1 block text-[10px] tracking-widest text-zinc-500">
                {collection.episodes} EPISODES
              </span>
            </span>
          </ZineCard>
        </button>
      ))}
    </div>
  );
}
