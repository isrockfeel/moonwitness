"use client";

import Link from "next/link";
import { navHref, type NavItem } from "./nav-items";
import { Crown, Smiley } from "@moonwitness/ui/icons";

interface SidebarProps {
  items: NavItem[];
  active: string;
  activeSection: string | null;
  onNavigate?: () => void;
}

export function Sidebar({ items, active, activeSection, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="block border-b-2 border-[var(--line)] px-5 py-5">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-9 text-[var(--yellow)]" />
          <span className="font-brush text-2xl leading-none text-white">
            MOON<span className="text-[var(--pink)]">WITNESS</span>
          </span>
        </div>
        <div className="mt-2 font-hand text-base text-zinc-400">Empire of the light</div>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Empire">
        {items.map((item) => {
          const isActive = item.id === active || item.id === activeSection;
          return (
            <Link
              key={item.id}
              href={navHref(item)}
              onClick={() => onNavigate?.()}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-[var(--pink)] font-bold text-white shadow-[3px_3px_0_rgba(0,0,0,0.5)]"
                  : "text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t-2 border-[var(--line)] p-4">
        <div className="sticker -rotate-2 px-3 py-2 font-hand text-base font-bold leading-tight">
          DIFFERENT PEOPLE.
          <br />
          SAME SKY.
          <br />
          STORIES BEYOND BORDERS.
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500">
          <Smiley className="h-4 w-4 text-[var(--yellow)]" />
          WITNESS THE REAL.
        </div>
      </div>
    </div>
  );
}
