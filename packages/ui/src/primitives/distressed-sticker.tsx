import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export type DistressedStickerVariant =
  | "classified"
  | "evidence"
  | "barcode"
  | "hazard"
  | "bootleg"
  | "foil";

export interface DistressedStickerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: DistressedStickerVariant;
  text?: string;
  code?: string;
}

export function DistressedSticker({
  variant = "evidence",
  text,
  code = "MW-77409-X",
  className,
  ...props
}: DistressedStickerProps) {
  if (variant === "barcode") {
    return (
      <div
        className={cn(
          "inline-flex flex-col items-center bg-[var(--paper)] text-black px-3 py-1 border border-black shadow-[3px_3px_0_rgba(0,0,0,0.7)] select-none",
          className,
        )}
        {...props}
      >
        <div className="flex items-center space-x-[2px] h-6 py-0.5" aria-hidden>
          {[4, 2, 6, 1, 3, 5, 2, 7, 1, 4, 3, 2, 5, 2, 6, 1, 3, 4].map((h, i) => (
            <div
              key={i}
              className="bg-black"
              style={{
                width: i % 3 === 0 ? "3px" : "1.5px",
                height: `${14 + (h % 8)}px`,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-[9px] font-black tracking-widest">{code}</span>
      </div>
    );
  }

  if (variant === "classified") {
    return (
      <div
        className={cn(
          "inline-block border-2 border-[var(--red)] text-[var(--red)] px-2.5 py-0.5 font-mono text-xs font-black tracking-widest uppercase rotate-[-6deg] shadow-[2px_2px_0_rgba(255,59,59,0.3)] select-none",
          className,
        )}
        {...props}
      >
        {text || "CLASSIFIED // DO NOT LEAK"}
      </div>
    );
  }

  if (variant === "hazard") {
    return (
      <div
        className={cn(
          "inline-block bg-[var(--yellow)] text-black px-3 py-1 font-mono text-xs font-black tracking-wider uppercase rotate-[3deg] shadow-[3px_3px_0_#000] border-2 border-black select-none",
          className,
        )}
        {...props}
      >
        ▲ {text || "HIGH VOLTAGE SIGNAL"} ▲
      </div>
    );
  }

  if (variant === "foil") {
    return (
      <div
        className={cn(
          "inline-block bg-gradient-to-r from-pink-400 via-cyan-300 to-yellow-300 text-black font-brush text-xs px-3 py-1 shadow-[3px_3px_0_rgba(0,0,0,0.8)] border border-white/60 select-none",
          className,
        )}
        {...props}
      >
        ★ {text || "ORIGINAL WITNESS AUDIO"} ★
      </div>
    );
  }

  // Evidence stamp default
  return (
    <div
      className={cn(
        "inline-block border-2 border-[var(--pink)] text-[var(--pink)] px-3 py-1 font-brush text-sm tracking-wider uppercase rotate-[4deg] shadow-[3px_3px_0_rgba(255,45,120,0.4)] select-none",
        className,
      )}
      {...props}
    >
      [ {text || "VERIFIED WITNESS SIGHTING"} ]
    </div>
  );
}
