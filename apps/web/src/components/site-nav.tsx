"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown, SearchIcon, GlobeIcon } from "@moonwitness/ui/icons";

const links = [
  { id: "home", label: "HOME" },
  { id: "signals", label: "SIGNALS" },
  { id: "archive", label: "ARCHIVE" },
  { id: "crew", label: "CREW" },
  { id: "about", label: "ABOUT" },
];

export function SiteNav() {
  const router = useRouter();
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const link of links) {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchOpen(false);
    router.push(query.trim() ? `/dock?q=${encodeURIComponent(query.trim())}` : "/dock");
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-[var(--line)] bg-[rgba(11,11,16,0.88)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Moonwitness home">
            <Crown className="h-5 w-8 text-[var(--yellow)]" />
            <span className="font-brush text-xl tracking-wide text-white sm:text-2xl">
              MOON<span className="text-[var(--pink)]">WITNESS</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary">
            {links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setActive(link.id)}
                className={`px-3 py-1.5 font-brush text-sm tracking-wider transition-colors ${
                  active === link.id
                    ? "text-[var(--pink)] underline decoration-[var(--yellow)] decoration-4 underline-offset-8"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search the archive"
              className="rounded-md p-2 text-zinc-300 transition-colors hover:bg-[var(--panel-2)] hover:text-white"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
            <Link
              href="/mission-control"
              aria-label="Open Mission Control"
              className="hidden rounded-md p-2 text-zinc-300 transition-colors hover:bg-[var(--panel-2)] hover:text-white sm:block"
            >
              <GlobeIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/shadow"
              className="btn-zine btn-paper hidden px-5 py-2 text-sm sm:inline-flex"
            >
              JOIN THE CREW →
            </Link>
            <button
              className="rounded-md p-2 text-zinc-200 lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                {menuOpen ? (
                  <path d="M5 5 L19 19 M19 5 L5 19" />
                ) : (
                  <path d="M4 7 L20 7 M4 12 L20 12 M4 17 L20 17" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            className="border-t border-[var(--line)] bg-[var(--ink)] px-4 py-3 lg:hidden"
            aria-label="Mobile"
          >
            {links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => {
                  setActive(link.id);
                  setMenuOpen(false);
                }}
                className={`block px-2 py-2.5 font-brush text-lg ${active === link.id ? "text-[var(--pink)]" : "text-zinc-200"}`}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/shadow"
              onClick={() => setMenuOpen(false)}
              className="btn-zine mt-2 px-5 py-2.5 text-base"
            >
              JOIN THE CREW →
            </Link>
          </nav>
        )}
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 pt-28 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <form
            onSubmit={submitSearch}
            className="zine-card-rough w-full max-w-xl p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Search the archive"
          >
            <label htmlFor="nav-search" className="font-brush text-lg text-[var(--yellow)]">
              SEARCH THE SIGNALS
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id="nav-search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="stories, signals, people, places…"
                className="zine-input rounded-md px-4 py-3 text-sm"
              />
              <button type="submit" className="btn-zine px-5 py-2 text-sm">
                GO
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Searches the Dock timeline chronicle.</p>
          </form>
        </div>
      )}
    </>
  );
}
