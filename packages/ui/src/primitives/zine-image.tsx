import { ARTWORK } from "@moonwitness/assets";
import type { ArtKey } from "@moonwitness/types";
import { cn } from "../cn";

export interface ZineImageProps {
  art: ArtKey;
  /** Menggantikan alt dari manifest bila penempatannya butuh teks lain. */
  alt?: string;
  className?: string;
  /** Atribut sizes CSS; wajib diisi bila lebar tampil berubah antar breakpoint. */
  sizes?: string;
  /** Menimpa objectPosition manifest, mis. pemotongan per event di data timeline. */
  position?: string;
  eager?: boolean;
}

/** Gambar non-LCP untuk komposit paket: <picture> avif + webp dari manifest. */
export function ZineImage({
  art,
  alt,
  className,
  sizes = "100vw",
  position,
  eager = false,
}: ZineImageProps) {
  const entry = ARTWORK[art];
  return (
    <picture>
      <source type="image/avif" srcSet={entry.srcSet} sizes={sizes} />
      <img
        src={entry.fallback}
        srcSet={entry.fallbackSrcSet}
        sizes={sizes}
        alt={alt ?? entry.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: position ?? entry.position ?? "center" }}
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    </picture>
  );
}
