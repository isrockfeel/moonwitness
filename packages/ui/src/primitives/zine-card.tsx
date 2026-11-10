import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function ZineCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("zine-card", className)} {...props} />;
}

export function ZineCardRough({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("zine-card-rough", className)} {...props} />;
}
