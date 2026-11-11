import { cn } from "../cn";
import { ZineCard } from "../primitives/zine-card";
import { Staple } from "../primitives/tactile-hardware";

export interface StatBlockProps {
  /** Nilai besar yang ditampilkan */
  value: string | number;
  /** Label di bawah nilai */
  label: string;
  /** Warna aksen (CSS custom property name, default --pink) */
  tone?: "pink" | "blue" | "yellow" | "green";
  /** Teks tren opsional */
  trend?: string;
}

const TONE_VAR: Record<string, string> = {
  pink: "var(--pink)",
  blue: "var(--blue)",
  yellow: "var(--yellow)",
  green: "var(--green)",
};

export function StatBlock({ value, label, tone = "pink", trend }: StatBlockProps) {
  const color = TONE_VAR[tone] ?? TONE_VAR.pink;
  return (
    <ZineCard className="photocopy-grit relative overflow-hidden p-4 shadow-[4px_4px_0_rgba(0,0,0,0.8)] transition-all hover:-translate-y-1">
      <Staple className="top-1 left-2 -rotate-45" />
      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: color }} />
      <div className="cmyk-slip font-brush text-3xl leading-none sm:text-4xl mt-1" style={{ color }}>
        {value}
      </div>
      <div className={cn("mt-2 font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase")}>{label}</div>
      {trend && <div className="mt-1 font-mono text-[10px] text-zinc-500">{trend}</div>}
    </ZineCard>
  );
}
