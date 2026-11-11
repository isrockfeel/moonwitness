import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

export type ZineTone = "pink" | "yellow" | "blue" | "paper";

const TONE_CLASS: Record<ZineTone, string> = {
  pink: "",
  yellow: "btn-yellow",
  blue: "btn-blue",
  paper: "btn-paper",
};

export interface ZineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ZineTone;
}

export function ZineButton({
  tone = "pink",
  className,
  type = "button",
  ...props
}: ZineButtonProps) {
  return <button type={type} className={cn("btn-zine", TONE_CLASS[tone], className)} {...props} />;
}
