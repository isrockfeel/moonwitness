import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export type StickerTone = "paper" | "pink" | "yellow" | "blue" | "black";

const TONE_CLASS: Record<StickerTone, string> = {
  paper: "",
  pink: "sticker-pink",
  yellow: "sticker-yellow",
  blue: "sticker-blue",
  black: "sticker-black",
};

export interface StickerProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StickerTone;
}

export function Sticker({ tone = "paper", className, ...props }: StickerProps) {
  return <span className={cn("sticker", TONE_CLASS[tone], className)} {...props} />;
}
