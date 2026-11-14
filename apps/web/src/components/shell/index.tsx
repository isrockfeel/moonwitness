"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSavedAvatar } from "@/lib/avatar-store";
import { useCurrentIdentity } from "@/lib/session";
import { Crown } from "@moonwitness/ui/icons";
import { activeByPath, navItems } from "./nav-items";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Notifications } from "./notifications";
import { ProfileMenu } from "./profile-menu";

export function EmpireShell({
  breadcrumb,
  search,
  children,
}: {
  breadcrumb: string;
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const active = activeByPath(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const session = useCurrentIdentity();
  const identity = session?.identity ?? "Creator // Empire";
  const role = session?.role ?? "Empire crew";
  const { seed: avatarSeed } = useSavedAvatar(identity);

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

  // Item "section" hanya aktif di halaman pemilik anchor-nya. sectionAnchors dibungkus
  // useMemo berbasis pathname supaya identitas objek tidak berubah tiap render (kalau
  // tidak, observer akan disconnect/reconnect tanpa henti).
  const sectionAnchors = useMemo(
    () =>
      navItems
        .filter((i) => i.target.kind === "section" && i.target.href === pathname)
        .map((i) => ({ id: i.id, anchor: (i.target as { anchor: string }).anchor })),
    [pathname],
  );

  useEffect(() => {
    if (sectionAnchors.length === 0) {
      setActiveSection(null);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const hit = sectionAnchors.find((i) => i.anchor === entry.target.id);
          if (hit) setActiveSection(hit.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const item of sectionAnchors) {
      const el = document.getElementById(item.anchor);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sectionAnchors]);

  function exitShadow() {
    // Clear session via API
    fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    router.push("/");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r-2 border-[var(--line)] bg-[var(--panel)] lg:block">
        <Sidebar
          items={navItems}
          active={active}
          activeSection={activeSection}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r-2 border-[var(--line)] bg-[var(--panel)]">
            <Sidebar
              items={navItems}
              active={active}
              activeSection={activeSection}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <Topbar
          breadcrumb={breadcrumb}
          search={search}
          onOpenSidebar={() => setSidebarOpen(true)}
          containerRef={popRef}
          notifications={
            <Notifications
              open={notifOpen}
              onToggle={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
              }}
            />
          }
          profileMenu={
            <ProfileMenu
              open={profileOpen}
              onToggle={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              identity={identity}
              role={role}
              onExit={exitShadow}
              avatarSeed={avatarSeed}
            />
          }
        />

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>

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
