import { cn } from "./cn";

export function comicNavItemClass(active: boolean, className?: string): string {
  return cn("comic-nav-link", active && "comic-nav-link-active", className);
}
