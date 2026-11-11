"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { Crown, SearchIcon } from "@moonwitness/ui/icons";
import { ZineInput } from "@moonwitness/ui";

interface TopbarProps {
  breadcrumb: string;
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  onOpenSidebar: () => void;
  notifications: ReactNode;
  profileMenu: ReactNode;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function Topbar({
  breadcrumb,
  search,
  onOpenSidebar,
  notifications,
  profileMenu,
  containerRef,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b-2 border-[var(--line)] bg-[rgba(11,11,16,0.9)] px-4 backdrop-blur-md">
      <button
        className="rounded-md p-1.5 text-zinc-300 lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M4 7 L20 7 M4 12 L20 12 M4 17 L20 17" />
        </svg>
      </button>
      <div className="hidden items-center gap-2 text-sm text-zinc-400 sm:flex">
        <Crown className="h-4 w-6 text-[var(--blue)]" />
        <Link href="/" className="hover:text-white">
          The Empire
        </Link>
        <span aria-hidden>›</span>
        <span className="text-zinc-200">{breadcrumb}</span>
      </div>

      <div className="relative ml-auto w-full max-w-xs sm:max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <ZineInput
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder}
          aria-label={search.placeholder}
          className="rounded-full py-2 pl-9 pr-4 text-xs"
        />
      </div>

      <div className="relative flex items-center gap-1" ref={containerRef}>
        {notifications}
        {profileMenu}
      </div>
    </header>
  );
}
