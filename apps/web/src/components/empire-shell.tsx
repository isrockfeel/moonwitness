"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { feedItems } from "@/lib/data";
import { roleLabel } from "@/lib/auth";
import { Crown, SearchIcon, Smiley } from "./zine";

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: "M4 11 L12 4 L20 11 M6 10 L6 20 L18 20 L18 10",
  },
  {
    id: "mission-control",
    label: "Mission Control",
    href: "/mission-control",
    icon: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M12 8 A4 4 0 1 0 12 16 A4 4 0 1 0 12 8",
  },
  {
    id: "dock",
    label: "Project Universe",
    href: "/dock",
    icon: "M4 8 L12 4 L20 8 L20 16 L12 20 L4 16 Z M4 8 L12 12 L20 8 M12 12 L12 20",
  },
  {
    id: "story-forge",
    label: "Story Forge",
    href: "/mission-control?module=story-forge",
    icon: "M4 20 L6 14 L16 4 L20 8 L10 18 Z M14 6 L18 10",
  },
  {
    id: "poster-lab",
    label: "Poster Lab",
    href: "/mission-control?module=poster-lab",
    icon: "M4 5 L20 5 L20 19 L4 19 Z M4 15 L9 10 L14 15 L17 12 L20 15 M9 8.5 A0.5 0.5 0 1 0 9 8.5",
  },
  {
    id: "research-lab",
    label: "Research Lab",
    href: "/mission-control?module=research-lab",
    icon: "M10 3 L14 3 M11 3 L11 9 L5 19 Q4 21 7 21 L17 21 Q20 21 19 19 L13 9 L13 3 M8 15 L16 15",
  },
  {
    id: "world-monitor",
    label: "World Monitor",
    href: "/mission-control?module=world-monitor",
    icon: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M3 12 L21 12 M12 3 Q17 8 17 12 Q17 16 12 21 Q7 16 7 12 Q7 8 12 3",
  },
  {
    id: "publishing-hub",
    label: "Publishing Hub",
    href: "/mission-control?module=publishing-hub",
    icon: "M3 11 L21 3 L13 21 L10 14 Z M10 14 L21 3",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/shadow",
    icon: "M12 8 A4 4 0 1 0 12 16 A4 4 0 1 0 12 8 M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M5 5 L7 7 M17 17 L19 19 M19 5 L17 7 M7 17 L5 19",
  },
];

export function EmpireShell({
  active,
  breadcrumb,
  search,
  children,
}: {
  active: string;
  breadcrumb: string;
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  children: ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [identity, setIdentity] = useState("Creator // Empire");
  const [role, setRole] = useState("Empire crew");
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mw-session") ?? sessionStorage.getItem("mw-session");
      if (raw) {
        const session = JSON.parse(raw) as { identity?: string; role?: string };
        if (session.identity) setIdentity(session.identity);
        if (session.role) setRole(roleLabel(session.role));
      }
    } catch {
      // no session yet
    }
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function exitShadow() {
    try {
      localStorage.removeItem("mw-session");
      sessionStorage.removeItem("mw-session");
    } catch {
      // ignore
    }
    router.push("/");
  }

  const sidebar = (
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
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            aria-current={active === item.id ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              active === item.id
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
        ))}
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

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r-2 border-[var(--line)] bg-[var(--panel)] lg:block">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r-2 border-[var(--line)] bg-[var(--panel)]">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b-2 border-[var(--line)] bg-[rgba(11,11,16,0.9)] px-4 backdrop-blur-md">
          <button
            className="rounded-md p-1.5 text-zinc-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
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
            <input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder}
              aria-label={search.placeholder}
              className="zine-input rounded-full py-2 pl-9 pr-4 text-xs"
            />
          </div>

          <div className="relative flex items-center gap-1" ref={popRef}>
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
              }}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              className="relative rounded-md p-2 text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 9 A6 6 0 1 0 6 9 L4 17 L20 17 Z M10 20 Q12 22 14 20" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--pink)] text-[9px] font-bold text-white">
                3
              </span>
            </button>
            <button
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              aria-label="Profile menu"
              aria-expanded={profileOpen}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--panel-2)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--pink)] bg-[var(--panel-2)] font-brush text-sm text-[var(--pink)]">
                {identity[0]?.toUpperCase() ?? "M"}
              </span>
              <span className="hidden text-left md:block">
                <span className="block max-w-[140px] truncate text-xs font-bold text-white">
                  {identity}
                </span>
                <span className="block text-[10px] text-zinc-500">{role}</span>
              </span>
            </button>

            {notifOpen && (
              <div
                className="zine-card absolute right-0 top-12 w-80 p-3"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-brush text-sm text-[var(--yellow)]">COMMAND FEED</span>
                  <span className="text-[10px] text-zinc-500">3 unread</span>
                </div>
                {feedItems.slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start gap-2 border-t border-[var(--line)] px-1 py-2.5"
                  >
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: f.color }}
                    />
                    <div>
                      <p className="text-xs leading-snug text-zinc-200">{f.text}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">{f.ago}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profileOpen && (
              <div
                className="zine-card absolute right-0 top-12 w-56 p-2"
                role="menu"
                aria-label="Profile"
              >
                <div className="border-b border-[var(--line)] px-3 py-2">
                  <p className="truncate text-xs font-bold text-white">{identity}</p>
                  <p className="text-[10px] text-zinc-500">Authorized crew</p>
                </div>
                <Link
                  href="/dock"
                  role="menuitem"
                  className="block rounded px-3 py-2 text-xs text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white"
                >
                  Project Universe
                </Link>
                <Link
                  href="/"
                  role="menuitem"
                  className="block rounded px-3 py-2 text-xs text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white"
                >
                  Public site
                </Link>
                <button
                  role="menuitem"
                  onClick={exitShadow}
                  className="block w-full rounded px-3 py-2 text-left text-xs text-[var(--pink)] hover:bg-[var(--panel-2)]"
                >
                  Exit the shadow →
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--line)] px-4 py-3 text-[10px] tracking-wider text-zinc-600">
          <span>MOONWITNESS XV /// DIFFERENT PEOPLE. SAME SKY. MANY STORIES.</span>
          <span className="flex items-center gap-2">
            <Crown className="h-3 w-5 text-[var(--yellow)]" /> EMPIRE OF THE LIGHT
          </span>
        </footer>
      </div>
    </div>
  );
}
