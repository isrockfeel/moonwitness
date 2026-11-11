import { Star4 } from "@moonwitness/ui/icons";

export interface SectionHeadingProps {
  id?: string;
  title: string;
  accent?: string;
  note?: string;
}

export function SectionHeading({ id, title, accent, note }: SectionHeadingProps) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h2 id={id} className="font-brush text-2xl text-white sm:text-3xl">
        {title}
        {accent && <span className="text-[var(--pink)]"> {accent}</span>}
      </h2>
      {note && (
        <span className="flex items-center gap-2 text-[10px] tracking-wider text-zinc-500">
          <Star4 className="h-3.5 w-3.5 text-[var(--yellow)]" />
          {note.toUpperCase()}
        </span>
      )}
    </div>
  );
}
