import { EmpireShell } from "@/components/shell";
import { DistressedSticker, Staple, TactileTape } from "@moonwitness/ui";

export const metadata = { title: "Story Studio — Moonwitness" };

export default function StoryForgePage() {
  return (
    <EmpireShell breadcrumb="Studios // Story Forge">
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-zinc-800 pb-4">
          <div>
            <DistressedSticker variant="hazard" text="PIRATE NARRATIVE FORGE" className="mb-2" />
            <h1 className="cmyk-slip font-brush text-4xl text-white">
              STORY <span className="text-[var(--pink)]">STUDIO</span>
            </h1>
          </div>
          <DistressedSticker variant="barcode" code="MOD-STORY-01" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="zine-card photocopy-grit relative p-6 lg:col-span-2">
            <Staple className="top-2 left-3 -rotate-12" />
            <TactileTape
              variant="yellow"
              label="TRANSMISSION DRAFT"
              width={140}
              className="-top-2 right-4 rotate-3 text-[10px]"
            />
            <h2 className="font-brush text-2xl text-white mb-2">
              RAW STORY INTERCEPT // VOICES IN THE FOG
            </h2>
            <p className="font-mono text-xs text-zinc-300 leading-relaxed mb-4">
              Recording captured on high-gain antenna near coordinates 35.6764° N, 139.6500° E. The
              signal carried harmonic vocal layers modulated through low-frequency radio rumble.
            </p>
            <div className="border border-zinc-800 bg-black/60 p-4 font-mono text-xs text-zinc-400">
              [00:04] WITNESS 09: &quot;The skyline looks different when the tower power drops. The
              moon isn&apos;t just reflecting sunlight; there&apos;s a pulse in the crater
              shadows.&quot;
            </div>
          </div>

          <div className="zine-card p-6">
            <h3 className="font-brush text-xl text-[var(--yellow)] mb-3">STUDIO METRICS</h3>
            <div className="space-y-3 font-mono text-xs text-zinc-400">
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span>ACTIVE DRAFTS:</span>
                <span className="text-white font-bold">14</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span>IN REVIEW:</span>
                <span className="text-[var(--pink)] font-bold">4</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span>VERIFIED LEAKS:</span>
                <span className="text-[var(--yellow)] font-bold">9</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EmpireShell>
  );
}
