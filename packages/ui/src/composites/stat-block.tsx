import { cn } from "../cn";
import { ZineCard } from "../primitives/zine-card";

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
    <ZineCard className="relative overflow-hidden p-4">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="font-brush text-3xl leading-none sm:text-4xl" style={{ color }}>
        {value}
      </div>
      <div className={cn("mt-2 text-[10px] tracking-widest text-zinc-500")}>{label}</div>
      {trend && <div className="mt-1 text-[11px] text-zinc-400">{trend}</div>}
    </ZineCard>
  );
}
