"use client";

import Link from "next/link";
import { WitnessAvatar, TactileTape, DistressedSticker } from "@moonwitness/ui";
import { Crown, RazorBlade } from "@moonwitness/ui/icons";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/audio-sfx";

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
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();

  return (
    <>
      <button
        onClick={() => {
          sfx.playClick();
          onToggle();
        }}
        aria-label="Profile menu"
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--panel-2)] transition-colors"
      >
        <WitnessAvatar
          seed={avatarSeed ?? identity}
          size={32}
          alt=""
          className="rounded-full border-2 border-[var(--pink)]"
          options={{ radius: 50 }}
        />
        <span className="hidden text-left md:block">
          <span className="block max-w-[140px] truncate font-mono text-xs font-bold text-white">
            {identity}
          </span>
          <span className="block font-mono text-[9px] text-[var(--yellow)]">
            {isAuthenticated ? role || "Authorized crew" : "GUEST OBSERVER"}
          </span>
        </span>
      </button>

      {open && (
        <div
          className="zine-card-rough absolute right-0 top-12 w-64 p-3 shadow-2xl bg-black/95 border-2 border-[var(--line)] z-50 select-none"
          role="menu"
          aria-label="Profile"
        >
          <TactileTape variant="black" className="-top-3 left-6 rotate-2 scale-75" />

          {/* User Info Header */}
          <div className="border-b border-dashed border-[var(--line)] px-2 pb-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] tracking-wider text-zinc-500 font-bold uppercase">
                IDENTITY PROFILE
              </span>
              <DistressedSticker
                variant={isAuthenticated ? "foil" : "classified"}
                text={isAuthenticated ? "VERIFIED" : "GUEST"}
                className="text-[8px] py-0 px-1.5"
              />
            </div>
            <p className="truncate font-brush text-lg text-white">{identity}</p>
            <p className="font-mono text-[10px] text-[var(--yellow)]">
              {isAuthenticated ? "SEC-LEVEL // 04" : "PUBLIC ACCESS ONLY"}
            </p>
          </div>

          {/* Vuexy-style App Links */}
          <div className="space-y-1">
            <Link
              href="/paas"
              role="menuitem"
              onClick={() => sfx.playClick()}
              className="flex items-center justify-between rounded px-3 py-2 font-mono text-xs text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white transition-colors"
            >
              <span>{t.navigation.paas}</span>
              <span className="text-[9px] text-[var(--yellow)]">ROOT</span>
            </Link>

            <Link
              href="/vpn"
              role="menuitem"
              onClick={() => sfx.playClick()}
              className="flex items-center justify-between rounded px-3 py-2 font-mono text-xs text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white transition-colors"
            >
              <span>{t.navigation.vpn}</span>
              <span className="text-[9px] text-[var(--pink)]">MESH</span>
            </Link>

            <Link
              href="/id-lab"
              role="menuitem"
              onClick={() => sfx.playClick()}
              className="block rounded px-3 py-2 font-mono text-xs text-[var(--yellow)] hover:bg-[var(--panel-2)] hover:text-white transition-colors"
            >
              {t.navigation.idLab}
            </Link>

            <Link
              href="/dock"
              role="menuitem"
              onClick={() => sfx.playClick()}
              className="block rounded px-3 py-2 font-mono text-xs text-zinc-300 hover:bg-[var(--panel-2)] hover:text-white transition-colors"
            >
              {t.navigation.dock}
            </Link>

            <Link
              href="/"
              role="menuitem"
              onClick={() => sfx.playClick()}
              className="block rounded px-3 py-2 font-mono text-xs text-zinc-400 hover:bg-[var(--panel-2)] hover:text-white transition-colors"
            >
              Public Broadcast →
            </Link>
          </div>

          {/* Logout / Exit Action */}
          <div className="border-t border-dashed border-[var(--line)] pt-2 mt-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                sfx.playTapePeel();
                onExit();
              }}
              className="flex min-h-10 w-full items-center justify-between rounded px-3 py-2 text-left font-mono text-xs font-bold text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
            >
              <span>{t.actions.logout}</span>
              <span>⚡</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
