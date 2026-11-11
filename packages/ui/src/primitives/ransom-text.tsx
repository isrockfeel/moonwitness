import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export interface RansomTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const ROTATIONS = [
  "-rotate-3",
  "rotate-2",
  "-rotate-2",
  "rotate-3",
  "-rotate-1",
  "rotate-1",
  "-rotate-4",
  "rotate-4",
];

const STYLES = [
  "bg-[var(--pink)] text-white font-brush",
  "bg-[var(--yellow)] text-black font-brush",
  "bg-white text-black font-mono font-black",
  "bg-[var(--blue)] text-black font-brush",
  "bg-black text-[var(--yellow)] border border-[var(--yellow)] font-mono",
  "bg-[var(--panel-2)] text-[var(--paper)] font-hand font-bold",
];

export function RansomText({ children, size = "md", className, ...props }: RansomTextProps) {
  const letters = children.split("");

  const sizeClasses = {
    sm: "text-xs px-1 py-0.5 m-0.5",
    md: "text-sm sm:text-base px-1.5 py-0.5 m-0.5",
    lg: "text-lg sm:text-2xl px-2 py-1 m-1",
    xl: "text-2xl sm:text-4xl md:text-5xl px-2.5 py-1.5 m-1",
  }[size];

  return (
    <span className={cn("inline-flex flex-wrap items-center select-none", className)} {...props}>
      {letters.map((char, index) => {
        if (char === " ") {
          return <span key={index} className="inline-block w-2 sm:w-3" />;
        }
        const rot = ROTATIONS[index % ROTATIONS.length];
        const style = STYLES[(index * 3) % STYLES.length];
        return (
          <span
            key={index}
            className={cn(
              "inline-block shadow-[2px_2px_0_rgba(0,0,0,0.8)] transition-transform hover:scale-125 hover:z-20 cursor-default",
              sizeClasses,
              rot,
              style,
            )}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
