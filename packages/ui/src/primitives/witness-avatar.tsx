import { avatarDataUri, type WitnessAvatarOptions } from "@moonwitness/avatars";
import { cn } from "../cn";

export interface WitnessAvatarProps {
  /** Seed deterministik — nama user, id crew, atau string apa pun. */
  seed: string;
  /** Ukuran render px; SVG tetap tajam di ukuran berapa pun. */
  size?: number;
  alt?: string;
  className?: string;
  /** Opsi style witness (palette, background, halftone, crown, moon, tape, radius, ...). */
  options?: Omit<WitnessAvatarOptions, "seed" | "size">;
}

/** Avatar default MoonWitness: satu seed = satu wajah zine, konsisten di seluruh app. */
export function WitnessAvatar({ seed, size = 40, alt, className, options }: WitnessAvatarProps) {
  return (
    <img
      src={avatarDataUri(seed, options)}
      alt={alt ?? `Avatar ${seed}`}
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}
