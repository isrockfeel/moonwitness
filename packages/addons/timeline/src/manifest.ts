import manifestData from "../manifest.json" with { type: "json" };

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

/** Single source of truth for what this addon registers with the AddonRegistry. */
export const timelineManifest: TimelineManifest = manifestData;
