import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export type ComicPanelTone = "ink" | "paper" | "pink";

export interface ComicPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: ComicPanelTone;
}

export function ComicPanel({ tone = "ink", className, ...props }: ComicPanelProps) {
  return <div className={cn("comic-panel", `comic-panel-${tone}`, className)} {...props} />;
}
