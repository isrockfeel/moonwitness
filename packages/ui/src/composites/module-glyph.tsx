import { MODULE_GLYPHS } from "./module-glyphs";

export interface ModuleGlyphProps {
  icon: string;
  className?: string;
}

/** Ikon modul: stroke SVG dari tabel path, fallback ke gear untuk kunci tak dikenal. */
export function ModuleGlyph({ icon, className }: ModuleGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={MODULE_GLYPHS[icon] ?? MODULE_GLYPHS.gear ?? ""} />
    </svg>
  );
}
