"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { Crown, SearchIcon } from "@moonwitness/ui/icons";
import { ZineInput } from "@moonwitness/ui";
import { useI18n } from "@/contexts/I18nContext";
import { sfx } from "@/lib/audio-sfx";

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
  const { locale, setLocale } = useI18n();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b-2 border-[var(--line)] bg-[rgba(11,11,16,0.9)] px-4 backdrop-blur-md">
      <button
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-1.5 text-zinc-300 lg:hidden"
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
          className="min-h-11 rounded-full py-2 pl-9 pr-4 text-xs"
        />
      </div>

      <div className="relative flex items-center gap-2" ref={containerRef}>
        {/* Vuexy-standard Language Switcher */}
        <button
          type="button"
          onClick={() => {
            sfx.playClick();
            setLocale(locale === "en" ? "id" : "en");
          }}
          className="flex min-h-9 items-center gap-1 border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 font-mono text-[10px] font-bold tracking-widest text-[var(--yellow)] hover:border-[var(--pink)] hover:text-white transition-colors"
          title={`Switch language: currently ${locale.toUpperCase()}`}
          aria-label="Toggle language"
        >
          <span>🌐</span>
          <span>{locale.toUpperCase()}</span>
        </button>

        {notifications}
        {profileMenu}
      </div>
    </header>
  );
}
