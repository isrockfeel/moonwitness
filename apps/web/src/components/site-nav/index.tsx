"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Crown, SearchIcon, GlobeIcon } from "@moonwitness/ui/icons";
import { links } from "./links";
import { MobileMenu } from "./mobile-menu";
import { SearchDialog } from "./search-dialog";

export function SiteNav() {
  const router = useRouter();
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
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
      <header
        className="fixed inset-x-0 top-0 z-50 border-b-2 border-[var(--line)] bg-[rgba(11,11,16,0.88)] backdrop-blur-md"
        onKeyDown={(event) => {
          if (menuOpen && event.key === "Escape") {
            event.preventDefault();
            setMenuOpen(false);
            menuToggleRef.current?.focus();
          }
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 max-lg:min-h-11"
            aria-label="Moonwitness home"
          >
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
                aria-current={active === link.id ? "true" : undefined}
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
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-zinc-300 transition-colors hover:bg-[var(--panel-2)] hover:text-white"
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
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-zinc-200 lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              ref={menuToggleRef}
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
          <MobileMenu
            links={links}
            active={active}
            onSelect={setActive}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </header>

      {searchOpen && (
        <SearchDialog
          query={query}
          onQueryChange={setQuery}
          onSubmit={submitSearch}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
