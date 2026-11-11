import Link from "next/link";
import { Crown } from "@moonwitness/ui/icons";

export function LandingFooter() {
  return (
    <footer className="border-t-2 border-[var(--line)] bg-[var(--ink)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-6 text-[var(--yellow)]" />
          <span className="font-brush text-sm text-white">
            MOON<span className="text-[var(--pink)]">WITNESS</span>
          </span>
          <span className="text-xs text-zinc-600">// Create · Curate · Publish</span>
        </div>
        <nav className="flex gap-5 text-xs text-zinc-500" aria-label="Footer">
          <Link href="/dock" className="hover:text-[var(--pink)] max-lg:min-h-11">
            Archive
          </Link>
          <Link href="/shadow" className="hover:text-[var(--pink)] max-lg:min-h-11">
            The Shadow
          </Link>
          <Link href="/mission-control" className="hover:text-[var(--pink)] max-lg:min-h-11">
            Mission Control
          </Link>
          <a href="#home" className="hover:text-[var(--pink)] max-lg:min-h-11">
            Back to top ↑
          </a>
        </nav>
      </div>
    </footer>
  );
}
