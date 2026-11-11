"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { roleLabel } from "@/lib/auth";
import { Crown } from "@moonwitness/ui/icons";
import { navItems } from "./nav-items";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Notifications } from "./notifications";
import { ProfileMenu } from "./profile-menu";

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

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r-2 border-[var(--line)] bg-[var(--panel)] lg:block">
        <Sidebar items={navItems} active={active} onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r-2 border-[var(--line)] bg-[var(--panel)]">
            <Sidebar items={navItems} active={active} onNavigate={() => setSidebarOpen(false)} />
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
            />
          }
        />

        <main id="main" className="min-w-0 flex-1">{children}</main>

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
