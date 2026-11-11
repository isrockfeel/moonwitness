"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createAvatar,
  PALETTES,
  WITNESS_BACKGROUNDS,
  WITNESS_PALETTES,
  type BackgroundName,
  type PaletteName,
} from "@moonwitness/avatars";
import {
  Sticker,
  WitnessAvatar,
  ZineButton,
  ZineCard,
  ZineCardRough,
  ZineInput,
  TactileTape,
  DistressedSticker,
  MangaSpeedLines,
} from "@moonwitness/ui";
import { Crown } from "@moonwitness/ui/icons";
import { EmpireShell } from "@/components/shell";
import { savedOptions, savedSeed, useAvatarStore } from "@/lib/avatar-store";
import { useCurrentIdentity } from "@/lib/session";

const SEED_POOL = [
  "Zill",
  "Mara",
  "Kenji",
  "Amara",
  "Elias",
  "Nadia",
  "Ravi",
  "Rezza",
  "Bulan",
  "Saksi",
  "Neon Kid",
  "Fog Voice",
  "Night Shift",
  "Mirror",
  "Skyline",
  "Static",
];

const BG_LABEL: Record<BackgroundName, string> = {
  ink: "INK",
  paper: "PAPER",
  transparent: "CLEAR",
};

function slugify(seed: string): string {
  return (
    seed
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "witness"
  );
}

function Control({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="border-b border-dashed border-[var(--line)] px-4 py-3 last:border-b-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400">{label}</span>
        {hint && <span className="font-hand text-sm text-[var(--yellow)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  render,
  ariaLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  render?: (v: T) => ReactNode;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={`min-h-9 border-2 px-2.5 text-[10px] font-bold tracking-wider transition-all ${
            value === opt
              ? "border-[var(--yellow)] bg-[var(--yellow)] text-black"
              : "border-[var(--line)] bg-[var(--panel-2)] text-zinc-300 hover:border-[var(--pink)] hover:text-white"
          }`}
        >
          {render ? render(opt) : opt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-9 w-full items-center justify-between gap-2 border-2 border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-left transition-colors hover:border-[var(--pink)]"
    >
      <span className="text-[10px] font-bold tracking-wider text-zinc-300">{label}</span>
      <span
        className={`relative h-4 w-8 shrink-0 rounded-full border transition-colors ${
          checked ? "border-[var(--yellow)] bg-[var(--yellow)]" : "border-zinc-600 bg-[#15151d]"
        }`}
      >
        <span
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-all ${
            checked ? "left-[18px] bg-black" : "left-[3px] bg-zinc-500"
          }`}
        />
      </span>
    </button>
  );
}

export function IdLab() {
  const [seed, setSeed] = useState("Rezza");
  const [palette, setPalette] = useState<PaletteName>("street");
  const [background, setBackground] = useState<BackgroundName>("ink");
  const [size, setSize] = useState(192);
  const [radius, setRadius] = useState(18);
  const [halftone, setHalftone] = useState(true);
  const [crown, setCrown] = useState(true);
  const [moon, setMoon] = useState(true);
  const [tape, setTape] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const previewRef = useRef<HTMLImageElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = useCurrentIdentity();
  const identity = session?.identity ?? "Creator // Empire";

  const { saved, storageAvailable, apply, reset: resetStore } = useAvatarStore(identity);

  // Buka avatar yang sudah tersimpan untuk identitas ini saat pertama kali mount.
  useEffect(() => {
    const s = savedSeed(saved);
    const o = savedOptions(saved);
    setSeed(s);
    setPalette(o.palette);
    setBackground(o.background);
    setRadius(o.radius);
    setHalftone(o.halftone);
    setCrown(o.crown);
    setMoon(o.moon);
    setTape(o.tape);
    setApplied(saved !== null);
  }, [saved]);

  const options = useMemo(
    () => ({ palette, background, radius, halftone, crown, moon, tape }),
    [palette, background, radius, halftone, crown, moon, tape],
  );

  const svg = useMemo(
    () => createAvatar({ seed, size: 512, ...options }).toString(),
    [seed, options],
  );

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const effectiveSeed = seed.trim() === "" ? "WITNESS" : seed;

  function randomSeed() {
    const next = SEED_POOL[Math.floor(Math.random() * SEED_POOL.length)] ?? "Witness";
    setSeed(`${next} ${Math.floor(Math.random() * 900 + 100)}`);
  }

  function randomizeAll() {
    randomSeed();
    setPalette(PALETTES[Math.floor(Math.random() * PALETTES.length)] ?? "street");
    setBackground(
      WITNESS_BACKGROUNDS[Math.floor(Math.random() * WITNESS_BACKGROUNDS.length)] ?? "ink",
    );
    setHalftone(Math.random() > 0.25);
    setCrown(Math.random() > 0.3);
    setMoon(Math.random() > 0.25);
    setTape(Math.random() > 0.55);
    setRadius([0, 12, 24, 50][Math.floor(Math.random() * 4)] ?? 0);
    flash("NEW FACE ROLLED");
  }

  function reset() {
    setSeed("Rezza");
    setPalette("street");
    setBackground("ink");
    setSize(192);
    setRadius(18);
    setHalftone(true);
    setCrown(true);
    setMoon(true);
    setTape(false);
    flash("BACK TO DEFAULT");
  }

  function applyAvatar() {
    const ok = apply(seed, {
      palette,
      background,
      radius,
      halftone,
      crown,
      moon,
      tape,
    });
    if (ok) {
      setApplied(true);
      flash("AVATAR SAVED TO PROFILE");
    } else {
      flash("STORAGE BLOCKED \u2014 AVATAR NOT SAVED");
    }
  }

  function resetToDefault() {
    const ok = resetStore();
    if (ok) {
      setSeed(savedSeed(null));
      const o = savedOptions(null);
      setPalette(o.palette);
      setBackground(o.background);
      setRadius(o.radius);
      setHalftone(o.halftone);
      setCrown(o.crown);
      setMoon(o.moon);
      setTape(o.tape);
      setApplied(false);
      flash("BACK TO DEFAULT");
    } else {
      flash("STORAGE BLOCKED \u2014 CANNOT RESET");
    }
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function exportSvg() {
    download(new Blob([svg], { type: "image/svg+xml" }), `witness-${slugify(effectiveSeed)}.svg`);
    flash("SVG EXPORTED");
  }

  function exportPng() {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 1024, 1024);
      canvas.toBlob((blob) => {
        if (!blob) return;
        download(blob, `witness-${slugify(effectiveSeed)}.png`);
        flash("PNG EXPORTED — 1024px");
      }, "image/png");
    };
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  async function copySvg() {
    try {
      await navigator.clipboard.writeText(svg);
      flash("SVG COPIED TO CLIPBOARD");
    } catch {
      flash("CLIPBOARD BLOCKED — USE DOWNLOAD");
    }
  }

  return (
    <EmpireShell
      breadcrumb="ID Lab"
      search={{ value: query, onChange: setQuery, placeholder: "Search the lab notes…" }}
    >
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-dashed border-[var(--line)] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-brush text-3xl text-white sm:text-5xl tracking-wide">
                ID <span className="text-[var(--pink)]">LAB</span>
              </h1>
              <DistressedSticker variant="classified" className="text-[10px] -rotate-3" text="BOOTLEG-PASSPORT" />
            </div>
            <p className="mt-2 max-w-xl font-hand text-xl text-zinc-300">
              Every witness gets a face. Same seed, same face — forged in our own underground ink.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DistressedSticker variant="foil" className="rotate-2 px-3 py-1 text-xs">
              BIO-SEALED
            </DistressedSticker>
            <Sticker tone="yellow" className="-rotate-2 px-3 py-1 font-brush text-xs">
              DICEBEAR × RIOT-DNA
            </Sticker>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ---- preview stage ---- */}
          <div className="space-y-6">
            <ZineCardRough className="relative overflow-hidden p-6 border-2 border-[var(--line)]">
              <TactileTape variant="yellow" className="-top-3 left-10 -rotate-2" />
              <TactileTape variant="black" className="-top-3 right-12 rotate-3" />
              <div className="halftone relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-md bg-[#0a0a10] p-8 border border-[var(--line)]">
                {/* Manga action backdrop inside avatar chamber */}
                <MangaSpeedLines
                  density={24}
                  opacity={0.25}
                  className="opacity-70 text-[var(--pink)]"
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 20%, rgba(46,168,255,0.22), transparent 55%), radial-gradient(circle at 75% 80%, rgba(255,45,120,0.2), transparent 55%)",
                  }}
                />
                <img
                  ref={previewRef}
                  key={`${effectiveSeed}-${palette}-${background}-${radius}-${halftone}-${crown}-${moon}-${tape}`}
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
                  alt={`Preview avatar ${effectiveSeed}`}
                  width={size}
                  height={size}
                  className="avatar-pop relative drop-shadow-[0_12px_32px_rgba(0,0,0,0.8)] filter contrast-110"
                  style={{ width: size, height: size }}
                  draggable={false}
                />
                <span className="sticker sticker-pink absolute bottom-3 left-3 -rotate-2 px-3 py-1 font-hand text-base font-bold shadow-lg">
                  {effectiveSeed.toUpperCase()}
                </span>
                <span className="absolute right-3 top-3 border border-[var(--line)] bg-black/80 px-2 py-1 text-[10px] font-mono tracking-widest text-[var(--yellow)]">
                  SPEC: {size}×{size} PX
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ZineButton tone="yellow" onClick={exportSvg} className="min-h-11 px-4 text-sm">
                  DOWNLOAD SVG
                </ZineButton>
                <ZineButton tone="blue" onClick={exportPng} className="min-h-11 px-4 text-sm">
                  DOWNLOAD PNG
                </ZineButton>
                <ZineButton tone="paper" onClick={copySvg} className="min-h-11 px-4 text-sm">
                  COPY SVG
                </ZineButton>
                <span className="ml-auto hidden items-center gap-1.5 text-[10px] tracking-wider text-zinc-500 sm:flex">
                  <Crown className="h-3 w-5 text-[var(--yellow)]" />
                  DETERMINISTIC BY SEED
                </span>
              </div>
            </ZineCardRough>

            {/* ---- in-context preview ---- */}
            <ZineCard className="p-5">
              <h2 className="mb-3 font-brush text-lg text-white">
                IN THE <span className="text-[var(--blue)]">WILD</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="border border-[var(--line)] bg-[var(--panel-2)] p-3">
                  <p className="mb-2 text-[9px] tracking-[0.2em] text-zinc-500">TOPBAR</p>
                  <div className="flex items-center gap-2">
                    <WitnessAvatar
                      seed={effectiveSeed}
                      size={32}
                      options={{ ...options, radius: 50 }}
                      className="rounded-full border-2 border-[var(--pink)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{effectiveSeed}</p>
                      <p className="text-[10px] text-zinc-500">Authorized crew</p>
                    </div>
                  </div>
                </div>
                <div className="border border-[var(--line)] bg-[var(--panel-2)] p-3">
                  <p className="mb-2 text-[9px] tracking-[0.2em] text-zinc-500">CREW CARD</p>
                  <div className="flex items-center gap-2">
                    <WitnessAvatar
                      seed={effectiveSeed}
                      size={44}
                      options={{ ...options, radius: 50 }}
                      className="rounded-full border-2 border-[var(--pink)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-brush text-sm text-white">{effectiveSeed}</p>
                      <p className="text-[10px] text-zinc-500">Same sky</p>
                    </div>
                  </div>
                </div>
                <div className="border border-[var(--line)] bg-[var(--panel-2)] p-3">
                  <p className="mb-2 text-[9px] tracking-[0.2em] text-zinc-500">SIZES</p>
                  <div className="flex items-end gap-2">
                    {[20, 32, 48].map((s) => (
                      <WitnessAvatar
                        key={s}
                        seed={effectiveSeed}
                        size={s}
                        options={{ ...options, radius: 50 }}
                        className="rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ZineCard>

            {/* ---- crew roll ---- */}
            <ZineCard className="p-5">
              <h2 className="mb-3 font-brush text-lg text-white">
                CREW <span className="text-[var(--pink)]">ROLL</span>
                <span className="ml-2 font-hand text-base text-zinc-500">
                  tap a face to wear it
                </span>
              </h2>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {SEED_POOL.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSeed(name)}
                    aria-pressed={seed === name}
                    className={`group flex flex-col items-center gap-1 border-2 p-2 transition-all ${
                      seed === name
                        ? "border-[var(--yellow)] bg-[#1a1a12]"
                        : "border-transparent hover:border-[var(--pink)] hover:bg-[var(--panel-2)]"
                    }`}
                  >
                    <WitnessAvatar
                      seed={name}
                      size={44}
                      options={{ radius: 50 }}
                      className="rounded-full transition-transform group-hover:scale-110"
                    />
                    <span className="w-full truncate text-center text-[9px] tracking-wider text-zinc-400 group-hover:text-white">
                      {name.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </ZineCard>
          </div>

          {/* ---- control deck (always visible) ---- */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ZineCardRough className="relative">
              <div className="flex items-center justify-between border-b-2 border-[var(--line)] px-4 py-3">
                <h2 className="font-brush text-base text-white">
                  CONTROL <span className="text-[var(--yellow)]">DECK</span>
                </h2>
                <span className="text-[9px] tracking-[0.2em] text-zinc-500">LIVE</span>
              </div>

              <Control label="SEED" hint="same seed = same face">
                <div className="flex gap-2">
                  <ZineInput
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Type any name…"
                    aria-label="Avatar seed"
                    className="min-h-10 flex-1"
                  />
                  <ZineButton
                    tone="pink"
                    onClick={randomSeed}
                    className="min-h-10 px-3 text-xs"
                    aria-label="Random seed"
                  >
                    ⤳
                  </ZineButton>
                </div>
              </Control>

              <Control label="PALETTE" hint={WITNESS_PALETTES[palette].label}>
                <div role="group" aria-label="Palette" className="grid grid-cols-2 gap-1.5">
                  {PALETTES.map((name) => {
                    const p = WITNESS_PALETTES[name];
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setPalette(name)}
                        aria-pressed={palette === name}
                        className={`flex min-h-10 items-center gap-2 border-2 px-2 text-[9px] font-bold tracking-wider transition-all ${
                          palette === name
                            ? "border-[var(--yellow)] bg-[#1a1a12] text-white"
                            : "border-[var(--line)] bg-[var(--panel-2)] text-zinc-400 hover:border-[var(--pink)]"
                        }`}
                      >
                        <span className="flex shrink-0 -space-x-1">
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black"
                            style={{ background: p.accent }}
                          />
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black"
                            style={{ background: p.accent2 }}
                          />
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black"
                            style={{ background: p.crown }}
                          />
                        </span>
                        {p.label.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </Control>

              <Control label="BACKGROUND">
                <Segmented
                  value={background}
                  options={WITNESS_BACKGROUNDS}
                  onChange={setBackground}
                  ariaLabel="Background"
                  render={(v) => BG_LABEL[v]}
                />
              </Control>

              <Control label="PREVIEW SIZE" hint={`${size}px`}>
                <input
                  type="range"
                  min={64}
                  max={288}
                  step={8}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  aria-label="Preview size"
                  className="zine-range w-full"
                />
              </Control>

              <Control label="CORNER CUT" hint={radius === 50 ? "CIRCLE" : `${radius}%`}>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  aria-label="Corner radius"
                  className="zine-range w-full"
                />
              </Control>

              <Control label="ZINE LAYERS">
                <div className="space-y-1.5">
                  <Toggle label="HALFTONE DOTS" checked={halftone} onChange={setHalftone} />
                  <Toggle label="CROWN" checked={crown} onChange={setCrown} />
                  <Toggle label="BIG MOON" checked={moon} onChange={setMoon} />
                  <Toggle label="TAPE" checked={tape} onChange={setTape} />
                </div>
              </Control>

              <div className="grid grid-cols-2 gap-2 px-4 py-4">
                <ZineButton tone="yellow" onClick={randomizeAll} className="min-h-11 text-sm">
                  RANDOMIZE
                </ZineButton>
                <ZineButton tone="paper" onClick={reset} className="min-h-11 text-sm">
                  RESET PREVIEW
                </ZineButton>
                <ZineButton
                  tone="pink"
                  onClick={applyAvatar}
                  className="col-span-2 min-h-11 px-4 text-sm"
                >
                  GUNAKAN AVATAR
                </ZineButton>
                <ZineButton
                  tone="paper"
                  onClick={resetToDefault}
                  className="col-span-2 min-h-11 px-4 text-sm"
                  disabled={!applied}
                >
                  KEMBALI KE AVATAR DEFAULT
                </ZineButton>
              </div>

              <div className="border-t-2 border-[var(--line)] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                      applied
                        ? "border-[var(--yellow)] bg-[var(--yellow)]/10 text-[var(--yellow)]"
                        : "border-[var(--line)] bg-[var(--panel-2)] text-zinc-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${applied ? "bg-[var(--yellow)]" : "bg-zinc-600"}`}
                    />
                    {applied ? "TERPASANG" : "DRAFT"}
                  </span>
                  <span className="text-[9px] tracking-[0.2em] text-zinc-600">
                    LOKAL DI BROWSER
                  </span>
                </div>
                <p className="mt-2 font-hand text-base leading-snug text-zinc-500">
                  {applied
                    ? "Wajah ini yang tampil di topbar profilmu."
                    : "Eksperimen di sini belum mengubah profilmu — tekan Gunakan Avatar untuk memasangnya."}
                </p>
                {!storageAvailable && (
                  <p className="mt-2 border border-[var(--pink)]/60 bg-[var(--pink)]/10 px-3 py-2 text-xs text-[var(--pink)]">
                    Penyimpanan lokal tidak tersedia — avatar tidak bisa disimpan di browser ini.
                  </p>
                )}
              </div>
            </ZineCardRough>
            <p className="mt-3 px-1 font-hand text-lg leading-snug text-zinc-500">
              Built on the DiceBear engine, redrawn in MoonWitness ink: halftone, torn edges, crowns
              and the big blue moon. One seed, one witness — everywhere in the empire.
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="sticker sticker-yellow fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-5 py-2.5 font-brush text-sm"
        >
          {toast}
        </div>
      )}
    </EmpireShell>
  );
}
