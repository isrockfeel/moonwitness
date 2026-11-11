import type { SVGProps } from "react";

export function Crown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <path
        d="M4 26 L2 8 L14 16 L24 3 L34 16 L46 8 L44 26 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M8 29.5 L40 29.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Bolt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 32" fill="currentColor" aria-hidden {...props}>
      <path d="M14 1 L3 18 L10 18 L8 31 L21 12 L13 12 Z" />
    </svg>
  );
}

export function Smiley(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M10 13 L12 15 M22 13 L20 15"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M9 20 Q16 26 23 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Star4(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 1 L14.5 9.5 L23 12 L14.5 14.5 L12 23 L9.5 14.5 L1 12 L9.5 9.5 Z" />
    </svg>
  );
}

export function Splatter(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden {...props}>
      <path d="M50 30 Q65 25 70 40 Q85 38 80 52 Q95 58 82 66 Q85 82 68 76 Q62 92 50 80 Q38 92 32 76 Q15 82 18 66 Q5 58 20 52 Q15 38 30 40 Q35 25 50 30 Z" />
      <circle cx="12" cy="25" r="3" />
      <circle cx="88" cy="20" r="2.5" />
      <circle cx="90" cy="85" r="3.5" />
      <circle cx="8" cy="80" r="2" />
      <circle cx="30" cy="10" r="2" />
      <circle cx="70" cy="8" r="1.8" />
    </svg>
  );
}

export function ArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M3 12 L20 12 M14 5 L21 12 L14 19"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M7 4 L20 12 L7 20 Z" />
    </svg>
  );
}

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <rect x="5" y="4" width="5" height="16" rx="1" />
      <rect x="14" y="4" width="5" height="16" rx="1" />
    </svg>
  );
}

export function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3 12 L21 12 M12 3 Q17 8 17 12 Q17 16 12 21 Q7 16 7 12 Q7 8 12 3"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M2 12 Q12 3 22 12 Q12 21 2 12 Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function CassetteTape(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 26" fill="none" aria-hidden {...props}>
      <rect x="2" y="2" width="36" height="22" rx="3" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
      <rect x="7" y="5" width="26" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="26" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14 L26 14" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1 2" />
      <path d="M9 24 L13 19 L27 19 L31 24 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function SafetyPin(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <path d="M7 6 Q9 3 13 4 L26 21 Q27 25 24 27 Q20 28 18 25 L5 8 Q4 6 7 6 Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="6" r="2" fill="currentColor" />
      <path d="M12 9 L23 23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BarbedWire(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 16" fill="none" aria-hidden {...props}>
      <path d="M0 8 L60 8" stroke="currentColor" strokeWidth="2" />
      {/* Barb 1 */}
      <path d="M16 2 L24 14 M24 2 L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="8" r="3" fill="currentColor" />
      {/* Barb 2 */}
      <path d="M40 2 L48 14 M48 2 L40 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="44" cy="8" r="3" fill="currentColor" />
    </svg>
  );
}

export function RazorBlade(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 36 22" fill="none" aria-hidden {...props}>
      <rect x="2" y="2" width="32" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11 L14 11 M22 11 L28 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="15" y="8" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7 L5 11 L2 15 M34 7 L31 11 L34 15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SprayCan(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 32" fill="none" aria-hidden {...props}>
      <rect x="5" y="11" width="14" height="19" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11 L7 7 Q12 5 17 7 L17 11" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="10" y="3" width="4" height="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 4 L19 2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 1.5" />
      <line x1="8" y1="18" x2="16" y2="18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SkullCrossbonesFunky(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      {/* Crossbones */}
      <line x1="4" y1="4" x2="28" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="4" x2="4" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Skull */}
      <path
        d="M10 14 C10 8 22 8 22 14 C22 17 20 18 19 21 L13 21 C12 18 10 17 10 14 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="var(--ink, #0b0b10)"
      />
      {/* Eye sockets */}
      <circle cx="13" cy="13" r="1.8" fill="currentColor" />
      <circle cx="19" cy="13" r="1.8" fill="currentColor" />
      {/* Teeth cuts */}
      <line x1="14" y1="21" x2="14" y2="23" stroke="currentColor" strokeWidth="1.5" />
      <line x1="18" y1="21" x2="18" y2="23" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function TornTicket(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 36 20" fill="none" aria-hidden {...props}>
      <path
        d="M2 3 L34 3 L34 8 Q31 10 34 12 L34 17 L2 17 L2 12 Q5 10 2 8 Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line x1="12" y1="4" x2="12" y2="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

export function StaplerMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 8" fill="none" aria-hidden {...props}>
      <line x1="2" y1="4" x2="22" y2="4" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
      <line x1="2" y1="2" x2="2" y2="6" stroke="currentColor" strokeWidth="2" />
      <line x1="22" y1="2" x2="22" y2="6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
