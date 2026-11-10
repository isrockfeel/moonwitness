/** Kunci artwork. Komponen UI tidak pernah menerima path mentah. */
export type ArtKey =
  | "hero-witness"
  | "city-shadow"
  | "crew-rooftop"
  | "signal-tunnel"
  | "shadow-command";

export type EraId = "origins" | "neon" | "fracture" | "rebuilding" | "expansions";

export type EventKind = "PROJECT" | "STORY" | "SIGNAL" | "WORLD" | "PEOPLE" | "RESEARCH";

export interface Era {
  id: EraId;
  name: string;
  years: string;
  tagline: string;
  color: string;
}

export interface TimelineEvent {
  id: string;
  kind: EventKind;
  date: string;
  era: EraId;
  title: string;
  excerpt: string;
  body: string;
  location: string;
  tags: string[];
  sources: number;
  notes: number;
  image: ArtKey;
  imagePosition?: string;
  related: string[];
}

export interface ModuleStat {
  label: string;
  value: number;
  color: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  stats: ModuleStat[];
}

export type ProjectStatus = "Active" | "Writing" | "Research" | "Planning";

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number;
  color: string;
  image: ArtKey;
  imagePosition: string;
}

export type WorkflowStatus = "Running" | "Queued" | "Paused";

export interface Workflow {
  id: string;
  name: string;
  detail: string;
  status: WorkflowStatus;
}

export interface FeedItem {
  id: string;
  text: string;
  ago: string;
  color: string;
}

export type AlertLevel = "high" | "medium" | "low";

export interface MissionAlert {
  id: string;
  text: string;
  ago: string;
  level: AlertLevel;
}

export interface Witness {
  id: string;
  name: string;
  place: string;
  x: number;
  y: number;
  quote: string;
  signals: number;
}
