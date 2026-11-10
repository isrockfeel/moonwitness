import { ARTWORK } from "@moonwitness/assets";
import type { ArtKey } from "@moonwitness/types";

/** next/image butuh path nyata; manifest memegangnya. */
export function artSrc(key: ArtKey): string {
  return ARTWORK[key].source;
}
