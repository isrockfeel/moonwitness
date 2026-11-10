import type { HTMLAttributes } from "react";
import { SOURCE_PROBE_CLASS } from "../probe";
import { cn } from "../cn";

export interface ZineBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color: string;
  /** true bila warna latarnya terang sehingga teks harus gelap. */
  dark?: boolean;
}

export function ZineBadge({ color, dark = false, className, style, ...props }: ZineBadgeProps) {
  return (
    <span
      className={cn(SOURCE_PROBE_CLASS, "px-2 py-0.5 font-brush text-[10px]", className)}
      style={{ background: color, color: dark ? "#111" : "#fff", ...style }}
      {...props}
    />
  );
}
