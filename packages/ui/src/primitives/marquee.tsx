import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Jalur berjalan. Isi dirender dua kali karena animasi menggeser -50%. */
export function Marquee({ children, className, ...props }: MarqueeProps) {
  return (
    <div aria-hidden className={cn("overflow-hidden", className)} {...props}>
      <div className="marquee-track flex w-max gap-8">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex gap-8">
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
