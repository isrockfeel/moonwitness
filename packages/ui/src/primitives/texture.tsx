import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export interface HalftoneProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "white" | "pink";
}

export function Halftone({ tone = "white", className, ...props }: HalftoneProps) {
  return (
    <div
      aria-hidden
      className={cn(tone === "pink" ? "halftone-pink" : "halftone", className)}
      {...props}
    />
  );
}

/** Lapisan noise. Parent harus `relative`; span ini menutupi seluruh parent. */
export function Grain({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden
      className={cn("grain pointer-events-none absolute inset-0", className)}
      {...props}
    />
  );
}
