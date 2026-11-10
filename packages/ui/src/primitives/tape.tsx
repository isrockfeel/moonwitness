import type { HTMLAttributes } from "react";
import { cn } from "../cn";

/** Dekorasi selotip. Parent harus `relative`. */
export function Tape({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden className={cn("tape", className)} {...props} />;
}
