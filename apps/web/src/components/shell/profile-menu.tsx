"use client";

import Link from "next/link";
import { WitnessAvatar } from "@moonwitness/ui";

interface ProfileMenuProps {
  open: boolean;
  onToggle: () => void;
  identity: string;
  role: string;
  onExit: () => void;
  avatarSeed?: string;
}

export function ProfileMenu({
  open,
  onToggle,
  identity,
  role,
  onExit,
  avatarSeed,
}: ProfileMenuProps) {
  return (
    <>
      <button
        onClick={onToggle}
        aria-label="Profile menu"
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--panel-2)]"
      >
        <WitnessAvatar
          seed={avatarSeed ?? identity}
          size={32}
          alt=""
          className="rounded-full border-2 border-[var(--pink)]"
          options={{ radius: 50 }}
        />
        <span className="hidden text-left md:block">
          <span className="block max-w-[140px] truncate text-xs font-bold text-white">
            {identity}
          </span>
          <span className="block text-[10px] text-zinc-500">{role}</span>
        </span>
      </button>
      {open && (
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
            className="block min-h-11 rounded px-3 py-2 text-xs text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white"
          >
            Project Universe
          </Link>
          <Link
            href="/id-lab"
            role="menuitem"
            className="block min-h-11 rounded px-3 py-2 text-xs text-[var(--yellow)] hover:bg-[var(--panel-2)] hover:text-white"
          >
            ID Lab — your witness face
          </Link>
          <Link
            href="/"
            role="menuitem"
            className="block min-h-11 rounded px-3 py-2 text-xs text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white"
          >
            Public site
          </Link>
          <button
            role="menuitem"
            onClick={onExit}
            className="flex min-h-11 w-full items-center rounded px-3 py-2 text-left text-xs text-[var(--pink)] hover:bg-[var(--panel-2)]"
          >
            Exit the shadow →
          </button>
        </div>
      )}
    </>
  );
}
