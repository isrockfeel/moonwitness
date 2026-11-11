import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
}

/** Tidak pakai next/link: ini anchor ke fragment di halaman yang sama. */
export function SkipLink({
  href = "#main",
  children = "Skip to content",
  className,
  ...props
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]",
        "focus:rounded-md focus:bg-[var(--yellow)] focus:px-4 focus:py-3",
        "focus:font-brush focus:text-black focus:shadow-[4px_4px_0_rgba(0,0,0,0.6)]",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
