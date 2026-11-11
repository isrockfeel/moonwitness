"use client";

import { useState, useRef } from "react";
import { DistressedSticker, MangaSpeedLines, Staple, TactileTape, ZineButton, ZineCardRough } from "@moonwitness/ui";
import { Crown, RazorBlade, BarbedWire, SprayCan, SkullCrossbonesFunky } from "@moonwitness/ui/icons";
import { sfx } from "@/lib/audio-sfx";

interface CanvasItem {
  id: string;
  type: "sticker" | "tape" | "staple" | "stamp" | "text";
  x: number;
  y: number;
  rotation: number;
  variant?: string;
  text?: string;
  scale?: number;
}

export function PosterStudioView() {
  const [items, setItems] = useState<CanvasItem[]>([
    { id: "init-1", type: "tape", x: 40, y: 30, rotation: -4, variant: "black" },
    { id: "init-2", type: "sticker", x: 180, y: 140, rotation: 6, variant: "classified", text: "UNAUTHORIZED PRINT" },
    { id: "init-3", type: "stamp", x: 120, y: 260, rotation: -8, variant: "skull" },
    { id: "init-4", type: "staple", x: 300, y: 40, rotation: 12 },
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSpeedLines, setShowSpeedLines] = useState(true);
  const [speedDensity, setSpeedDensity] = useState(36);
  const [paperTone, setPaperTone] = useState<"dark" | "newsprint" | "neon">("dark");
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Add Item to Canvas
  function addItem(type: CanvasItem["type"], variant?: string, text?: string) {
    sfx.playTapePeel();
    const newItem: CanvasItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: 80 + Math.random() * 160,
      y: 80 + Math.random() * 180,
      rotation: Math.floor(Math.random() * 24) - 12,
      variant,
      text,
      scale: 1,
    };
    setItems((prev) => [...prev, newItem]);
    setActiveId(newItem.id);
  }

  // Canvas Drag Handling
  function handleMouseDown(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    sfx.playClick();
    setActiveId(id);
    setIsDragging(true);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !activeId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(rect.width - 60, e.clientX - rect.left - 40));
    const y = Math.max(10, Math.min(rect.height - 40, e.clientY - rect.top - 20));

    setItems((prev) =>
      prev.map((item) => (item.id === activeId ? { ...item, x, y } : item))
    );
  }

  function handleMouseUp() {
    if (isDragging) {
      sfx.playStamp();
      setIsDragging(false);
    }
  }

  function rotateActive(delta: number) {
    if (!activeId) return;
    sfx.playClick();
    setItems((prev) =>
      prev.map((item) =>
        item.id === activeId ? { ...item, rotation: item.rotation + delta } : item
      )
    );
  }

  function removeActive() {
    if (!activeId) return;
    sfx.playGlitch();
    setItems((prev) => prev.filter((item) => item.id !== activeId));
    setActiveId(null);
  }

  function clearCanvas() {
    sfx.playGlitch();
    setItems([]);
    setActiveId(null);
  }

  return (
    <div className="space-y-6">
      {/* Studio Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-[var(--line)] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DistressedSticker variant="hazard" text="INTERACTIVE MANGA LAB" />
            <span className="font-mono text-xs text-[var(--pink)]">DRAG-AND-DROP CANVAS</span>
          </div>
          <h1 className="cmyk-slip font-brush text-3xl text-white sm:text-5xl">
            POSTER <span className="text-[var(--yellow)]">STUDIO</span> // FORGE
          </h1>
        </div>

        {/* Global Canvas Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <ZineButton
            tone={showSpeedLines ? "pink" : "paper"}
            onClick={() => {
              sfx.playClick();
              setShowSpeedLines((v) => !v);
            }}
            className="text-xs px-3 py-1.5"
          >
            {showSpeedLines ? "SPEEDLINES: ON" : "SPEEDLINES: OFF"}
          </ZineButton>

          <ZineButton
            tone="paper"
            onClick={() => {
              sfx.playTapePeel();
              setPaperTone((prev) => (prev === "dark" ? "newsprint" : prev === "newsprint" ? "neon" : "dark"));
            }}
            className="text-xs px-3 py-1.5"
          >
            PAPER: {paperTone.toUpperCase()}
          </ZineButton>

          <ZineButton tone="yellow" onClick={clearCanvas} className="text-xs px-3 py-1.5">
            CLEAR CANVAS
          </ZineButton>
        </div>
      </header>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Toolbox Panel */}
        <div className="space-y-5">
          {/* Stickers Tray */}
          <ZineCardRough className="p-4 space-y-3">
            <h3 className="font-brush text-lg text-white flex items-center gap-2">
              <Crown className="h-4 w-6 text-[var(--yellow)]" /> STICKER TRAY
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addItem("sticker", "classified", "CLASSIFIED // DO NOT LEAK")}
                className="btn-zine btn-paper p-2 text-left text-[10px] font-mono leading-tight hover:border-[var(--pink)]"
              >
                + CLASSIFIED
              </button>
              <button
                type="button"
                onClick={() => addItem("sticker", "hazard", "HIGH VOLTAGE")}
                className="btn-zine btn-yellow p-2 text-left text-[10px] font-mono leading-tight"
              >
                + HAZARD
              </button>
              <button
                type="button"
                onClick={() => addItem("sticker", "barcode", "MW-8820-Z")}
                className="btn-zine btn-paper p-2 text-left text-[10px] font-mono leading-tight hover:border-[var(--yellow)]"
              >
                + BARCODE
              </button>
              <button
                type="button"
                onClick={() => addItem("sticker", "foil", "ORIGINAL WITNESS")}
                className="btn-zine btn-blue p-2 text-left text-[10px] font-mono leading-tight"
              >
                + FOIL SEAL
              </button>
            </div>
          </ZineCardRough>

          {/* Hardware & Stamp Tray */}
          <ZineCardRough className="p-4 space-y-3">
            <h3 className="font-brush text-lg text-white flex items-center gap-2">
              <SprayCan className="h-4 w-5 text-[var(--pink)]" /> HARDWARE & STAMPS
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addItem("tape", "black", "EVIDENCE SEAL")}
                className="btn-zine btn-paper p-2 text-left text-[10px] font-mono"
              >
                + DUCT TAPE
              </button>
              <button
                type="button"
                onClick={() => addItem("tape", "yellow", "RESTRICTED")}
                className="btn-zine btn-yellow p-2 text-left text-[10px] font-mono"
              >
                + CAUTION TAPE
              </button>
              <button
                type="button"
                onClick={() => addItem("staple")}
                className="btn-zine btn-paper p-2 text-left text-[10px] font-mono"
              >
                + METAL STAPLE
              </button>
              <button
                type="button"
                onClick={() => addItem("stamp", "skull")}
                className="btn-zine btn-blue p-2 text-left text-[10px] font-mono"
              >
                + SKULL STAMP
              </button>
            </div>
          </ZineCardRough>

          {/* Active Item Inspector */}
          {activeId && (
            <div className="zine-card p-4 space-y-3 border-2 border-[var(--pink)] bg-black/80">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black text-[var(--yellow)] uppercase">
                  ITEM SELECTED
                </span>
                <span className="font-mono text-[9px] text-zinc-400">ID: {activeId.slice(-6)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => rotateActive(-15)}
                  className="btn-zine btn-paper flex-1 py-1 text-xs font-mono"
                >
                  ↺ -15°
                </button>
                <button
                  type="button"
                  onClick={() => rotateActive(15)}
                  className="btn-zine btn-paper flex-1 py-1 text-xs font-mono"
                >
                  ↻ +15°
                </button>
                <button
                  type="button"
                  onClick={removeActive}
                  className="btn-zine btn-yellow px-3 py-1 text-xs font-mono"
                >
                  DELETE
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Interactive Art Canvas */}
        <div
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative min-h-[560px] rounded-lg border-2 border-dashed border-[var(--line)] overflow-hidden transition-colors select-none ${
            paperTone === "newsprint"
              ? "bg-[#e8e4d8] text-black"
              : paperTone === "neon"
              ? "bg-[#0b101c] text-white"
              : "bg-[#0d0d14] text-white"
          }`}
        >
          {/* Action Manga Speedlines Layer */}
          {showSpeedLines && (
            <MangaSpeedLines
              density={speedDensity}
              center={[50, 50]}
              opacity={paperTone === "newsprint" ? 0.18 : 0.28}
              className="text-white"
            />
          )}

          {/* Background Poster Artwork Base */}
          <div className="absolute inset-x-8 top-12 text-center pointer-events-none opacity-40">
            <h2 className="font-brush text-5xl sm:text-7xl tracking-widest uppercase">
              MOONWITNESS
            </h2>
            <p className="font-mono text-xs tracking-[0.3em] mt-1 text-[var(--pink)] font-bold">
              RIOT ZINE SCREENING // ISSUE NO. 04
            </p>
          </div>

          {/* Placed Dynamic Canvas Items */}
          {items.map((item) => {
            const isSelected = item.id === activeId;
            return (
              <div
                key={item.id}
                onMouseDown={(e) => handleMouseDown(item.id, e)}
                style={{
                  transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg)`,
                  position: "absolute",
                  cursor: isDragging && isSelected ? "grabbing" : "grab",
                }}
                className={`transition-shadow z-20 ${
                  isSelected ? "ring-2 ring-[var(--pink)] ring-offset-2 ring-offset-black" : ""
                }`}
              >
                {item.type === "sticker" && (
                  <DistressedSticker
                    variant={item.variant as any}
                    text={item.text}
                    code={item.text}
                    className="shadow-xl"
                  />
                )}
                {item.type === "tape" && (
                  <TactileTape
                    variant={item.variant as any}
                    label={item.text}
                    width={130}
                    className="shadow-md"
                  />
                )}
                {item.type === "staple" && <Staple className="shadow-sm" />}
                {item.type === "stamp" && (
                  <div className="text-[var(--pink)] p-2 rounded-full border-2 border-dashed border-[var(--pink)] bg-black/40 rotate-12">
                    <SkullCrossbonesFunky className="h-10 w-10" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Canvas Bottom Meta */}
          <div className="pointer-events-none absolute bottom-3 inset-x-4 flex justify-between font-mono text-[9px] text-zinc-500 font-bold">
            <span>CANVAS: 2400×3200 DRAFT MODE</span>
            <span>ITEMS ON SCREEN: {items.length}</span>
            <span>CLICK TO SELECT // DRAG TO POSITION</span>
          </div>
        </div>
      </div>
    </div>
  );
}

