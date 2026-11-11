"use client";

import Link from "next/link";
import { navHref, navigationGroups, type NavItem } from "./nav-items";
import { Crown, Smiley } from "@moonwitness/ui/icons";
import { TactileTape } from "@moonwitness/ui";

interface SidebarProps {
  items?: NavItem[];
  active: string;
  activeSection: string | null;
  onNavigate?: () => void;
}

export function Sidebar({ active, activeSection, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-[var(--ink)] border-r-2 border-[var(--line)]">
      {/* Brand Header with Zine Hardware */}
      <Link href="/" className="relative block border-b-2 border-dashed border-[var(--line)] px-5 py-5 hover:bg-black/40 transition-colors">
        <TactileTape variant="black" className="-top-3 left-6 rotate-2 scale-75" />
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-9 text-[var(--yellow)] -rotate-6" />
          <span className="font-brush text-2xl leading-none text-white tracking-wider">
            MOON<span className="text-[var(--pink)]">WITNESS</span>
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-hand text-base text-zinc-400">Empire of the light</span>
          <span className="font-mono text-[9px] text-[var(--yellow)] border border-[var(--line)] px-1.5 py-0.5 bg-black/60">
            v2.6 // RIOT
          </span>
        </div>
      </Link>

      {/* Centralized Grouped Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 select-none" aria-label="Empire">
        {navigationGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {/* Group Header Badge */}
            <div className="mb-2 flex items-center justify-between px-2 pt-1 border-b border-[var(--line)]/50 pb-1">
              <span className="font-mono text-[10px] font-black tracking-widest text-zinc-400">
                {group.title}
              </span>
              <span className="font-mono text-[8px] text-[var(--pink)] tracking-tighter">
                {group.tag}
              </span>
            </div>

            {/* Nav Group Items */}
            {group.items.map((item) => {
              const isActive = item.id === active || item.id === activeSection;
              return (
                <Link
                  key={item.id}
                  href={navHref(item)}
                  onClick={() => onNavigate?.()}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex min-h-10 items-center justify-between rounded-md px-3 py-2 text-xs font-mono transition-all ${
                    isActive
                      ? "bg-[var(--pink)] font-bold text-white shadow-[3px_3px_0_rgba(0,0,0,0.7)] translate-x-1"
                      : "text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? "text-white" : "text-zinc-400 group-hover:text-[var(--yellow)]"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d={item.icon} />
                    </svg>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`shrink-0 text-[8px] font-black px-1.5 py-0.2 tracking-wider ${
                        isActive
                          ? "bg-black text-[var(--yellow)]"
                          : item.badgeTone === "yellow"
                          ? "bg-[var(--yellow)] text-black"
                          : item.badgeTone === "hazard"
                          ? "bg-zinc-800 text-[var(--yellow)] border border-[var(--line)]"
                          : "bg-[var(--pink)] text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Manifesto & Status */}
      <div className="relative border-t-2 border-[var(--line)] p-4 bg-black/40">
        <TactileTape variant="yellow" className="-top-3 right-6 -rotate-2 scale-75" />
        <div className="sticker -rotate-2 px-3 py-2 font-hand text-base font-bold leading-tight">
          DIFFERENT PEOPLE.
          <br />
          SAME SKY.
          <br />
          STORIES BEYOND BORDERS.
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Smiley className="h-4 w-4 text-[var(--yellow)]" />
            <span>WITNESS THE REAL</span>
          </div>
          <span className="text-[var(--pink)] font-bold">NODE #774</span>
        </div>
      </div>
    </div>
  );
}
