import { EmpireShell } from "@/components/shell";
import { DistressedSticker, Staple, TactileTape } from "@moonwitness/ui";

export const metadata = { title: "Poster Forge — Moonwitness" };

export default function PosterLabPage() {
  return (
    <EmpireShell breadcrumb="Studios // Poster Forge">
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker variant="foil" text="GUERILLA SCREENPRINT LAB" className="mb-2" />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              POSTER <span className="text-[var(--yellow)]">FORGE</span>
            </h1>
          </div>
          <DistressedSticker variant="barcode" code="MOD-POSTER-02" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="zine-card photocopy-grit relative p-6 lg:col-span-2">
            <Staple className="top-2 left-3 -rotate-12" />
            <TactileTape
              variant="black"
              label="PRINT PROOF"
              width={110}
              className="-top-2 right-4 -rotate-2 text-[10px]"
            />
            <h2 className="font-brush text-2xl text-white mb-2">
              SILKSCREEN MATRIX // 4-PASS CMYK SLIP
            </h2>
            <p className="font-mono text-xs text-zinc-300 leading-relaxed mb-4">
              Bootleg wheatpaste flyer templates designed for night runs. Supports 1-bit bitmap
              halftone screening, photocopy burn margins, and stencil overlay registration.
            </p>
            <div className="flex gap-4">
              <div className="border border-zinc-800 bg-black/70 p-4 font-mono text-xs text-[var(--pink)]">
                PASS 1: MAGENTA INK (SCREEN 65 LPI)
              </div>
              <div className="border border-zinc-800 bg-black/70 p-4 font-mono text-xs text-[var(--yellow)]">
                PASS 2: ACID YELLOW (OFFSET +2px)
              </div>
            </div>
          </div>

          <div className="zine-card p-6">
            <h3 className="font-brush text-xl text-[var(--blue)] mb-3">FLYER RELEASES</h3>
            <div className="space-y-3 font-mono text-xs text-zinc-400">
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span>BATCH RUNS:</span>
                <span className="text-white font-bold">42</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span>STREET POSTS:</span>
                <span className="text-[var(--pink)] font-bold">128</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span>DISTRESSED EDITIONS:</span>
                <span className="text-[var(--yellow)] font-bold">ALL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EmpireShell>
  );
}
