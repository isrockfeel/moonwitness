import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface TimelineManifest {
  name: "timeline";
  version: string;
  description: string;
  depends: string[];
  provides: {
    routes: string[];
    models: string[];
    auditActions: string[];
  };
}

const manifestPath = join(dirname(fileURLToPath(import.meta.url)), "..", "manifest.json");

/** Single source of truth for what this addon registers with the AddonRegistry. */
export const timelineManifest: TimelineManifest = JSON.parse(
  readFileSync(manifestPath, "utf8"),
) as TimelineManifest;
