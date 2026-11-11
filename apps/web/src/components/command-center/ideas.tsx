import { Halftone } from "@moonwitness/ui";
import { SectionHeading } from "./section-heading";

export function IdeasInMotion() {
  return (
    <section aria-labelledby="cc-ideas-heading" className="scroll-mt-24">
      <SectionHeading id="cc-ideas-heading" title="IDEAS PEOPLE WORLDS" accent="IN MOTION" />
      <div className="relative overflow-hidden border-2 border-[var(--line)] bg-black">
        <Halftone tone="white" className="absolute inset-0 opacity-30" />
        <div className="relative z-10 px-5 py-10 text-center">
          <p className="font-brush text-2xl leading-tight text-white sm:text-4xl">
            DIFFERENT PEOPLE. SAME SKY.
            <br />
            <span className="text-[var(--yellow)]">STORIES BEYOND BORDERS.</span>
          </p>
          <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-zinc-400">
            Every episode starts as a scribbled idea on a rooftop. This board is where those
            scribbles wait to be picked up.
          </p>
        </div>
      </div>
    </section>
  );
}
