"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const navigationGroups = [
  {
    label: "Overview",
    items: [
      {
        href: "/control",
        label: "Control",
        icon: "M4 13 L10 13 L10 19 L4 19 Z M14 5 L20 5 L20 19 L14 19 Z M4 5 L10 5 L10 9 L4 9 Z",
      },
    ],
  },
  {
    label: "Network",
    items: [
      {
        href: "/vpn",
        label: "VPN",
        icon: "M5 5 L19 5 L19 11 L5 11 Z M8 11 L8 15 M16 11 L16 15 M6 15 L18 15 L18 20 L6 20 Z",
      },
    ],
  },
] as const;

export function OperationsShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--ink)] text-zinc-100">
      <a
        href="#operations-main"
        className="sr-only z-50 rounded bg-[var(--paper)] px-4 py-2 text-[var(--ink)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to operations content
      </a>

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-4 border-b border-[var(--line)] bg-[var(--ink)]/95 px-4 backdrop-blur sm:px-6 lg:col-start-2 lg:row-start-1">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--line)] text-zinc-300 transition-colors hover:bg-[var(--panel-2)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] lg:hidden"
            aria-controls="operations-navigation"
            aria-expanded={navigationOpen}
            aria-label={
              navigationOpen ? "Close operations navigation" : "Open operations navigation"
            }
            onClick={() => setNavigationOpen((open) => !open)}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              {navigationOpen ? (
                <path d="M6 6 L18 18 M18 6 L6 18" />
              ) : (
                <path d="M4 7 L20 7 M4 12 L20 12 M4 17 L20 17" />
              )}
            </svg>
          </button>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--blue)]">
              Moonwitness / Operations
            </p>
            <h1 className="truncate text-sm font-semibold text-white">{title}</h1>
          </div>
        </header>

        <aside
          id="operations-navigation"
          className={`${navigationOpen ? "block" : "hidden"} border-b border-[var(--line)] bg-[var(--panel)] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:block lg:border-b-0 lg:border-r`}
        >
          <Link
            href="/"
            className="flex min-h-16 items-center border-b border-[var(--line)] px-5 text-sm font-bold tracking-[0.16em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue)]"
            onClick={() => setNavigationOpen(false)}
          >
            MOONWITNESS
          </Link>

          <nav aria-label="Operations" className="space-y-6 px-3 py-5">
            {navigationGroups.map((group) => (
              <section key={group.label} aria-labelledby={`operations-group-${group.label}`}>
                <h2
                  id={`operations-group-${group.label}`}
                  className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500"
                >
                  {group.label}
                </h2>
                <ul className="mt-2 space-y-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-11 items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
                            active
                              ? "border-[var(--blue)] bg-[var(--panel-2)] font-semibold text-white"
                              : "border-transparent text-zinc-400 hover:bg-[var(--panel-2)] hover:text-white"
                          }`}
                          onClick={() => setNavigationOpen(false)}
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
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>
        </aside>

        <main
          id="operations-main"
          className="min-w-0 px-4 py-6 sm:px-6 lg:col-start-2 lg:row-start-2"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
