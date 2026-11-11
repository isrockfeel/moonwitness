import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export interface TactileTapeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "black" | "yellow" | "masking";
  label?: string;
  width?: number | string;
}

export function TactileTape({
  variant = "black",
  label,
  width = 110,
  className,
  style,
  ...props
}: TactileTapeProps) {
  const isYellow = variant === "yellow";
  const tapeClass = isYellow ? "duct-tape-yellow" : "duct-tape-black";

  return (
    <span aria-hidden className={cn(tapeClass, className)} style={{ width, ...style }} {...props}>
      {label && <span className="truncate px-2">{label}</span>}
    </span>
  );
}

export interface StapleProps extends HTMLAttributes<HTMLSpanElement> {
  rotate?: number;
}

export function Staple({ rotate = 0, className, style, ...props }: StapleProps) {
  return (
    <span
      aria-hidden
      className={cn("staple-metal", className)}
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      {...props}
    />
  );
}
