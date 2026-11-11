import type {
  Collection,
  FeedItem,
  MapCity,
  MissionAlert,
  Module,
  PipelineColumn,
  Project,
  QuickAction,
  UniverseStat,
  Witness,
  Workflow,
  WorkspaceItem,
} from "@moonwitness/types";

export const modules: Module[] = [
  {
    id: "story-forge",
    name: "Story Forge",
    description: "Develop stories, characters, worlds and narratives.",
    color: "#ff2d78",
    icon: "pen",
    stats: [
      { label: "active projects", value: 12, color: "#3ddc84" },
      { label: "in review", value: 4, color: "#2ea8ff" },
    ],
  },
  {
    id: "poster-lab",
    name: "Poster Lab",
    description: "Create visual stories, posters, and social campaigns.",
    color: "#2ea8ff",
    icon: "image",
    stats: [
      { label: "in progress", value: 8, color: "#3ddc84" },
      { label: "queued", value: 3, color: "#ff2d78" },
    ],
  },
  {
    id: "research-lab",
    name: "Research Lab",
    description: "Explore cultures, ideas, people and real world context.",
    color: "#a855f7",
    icon: "flask",
    stats: [
      { label: "active signals", value: 46, color: "#3ddc84" },
      { label: "new today", value: 12, color: "#2ea8ff" },
    ],
  },
  {
    id: "world-monitor",
    name: "World Monitor",
    description: "Track global signals, trends and stories in motion.",
    color: "#ffd21f",
    icon: "globe",
    stats: [
      { label: "live sources", value: 128, color: "#3ddc84" },
      { label: "alerts", value: 7, color: "#ff2d78" },
    ],
  },
  {
    id: "publishing-hub",
    name: "Publishing Hub",
    description: "Prepare and publish across platforms and communities.",
    color: "#ff2d78",
    icon: "send",
    stats: [
      { label: "scheduled", value: 5, color: "#3ddc84" },
      { label: "publishing", value: 2, color: "#2ea8ff" },
    ],
  },
  {
    id: "automation-center",
    name: "Automation Center",
    description: "Manage AI workflows, agents and automated operations.",
    color: "#2ea8ff",
    icon: "gear",
    stats: [
      { label: "active workflows", value: 18, color: "#3ddc84" },
      { label: "paused", value: 3, color: "#ff2d78" },
    ],
  },
  {
    id: "source-verification",
    name: "Source Verification",
    description: "Verify sources, facts and media before publishing.",
    color: "#a855f7",
    icon: "shield",
    stats: [
      { label: "items in queue", value: 34, color: "#3ddc84" },
      { label: "flagged", value: 6, color: "#ff2d78" },
    ],
  },
];

export const projects: Project[] = [
  {
    id: "batteries",
    title: "The Batteries",
    status: "Active",
    progress: 72,
    color: "#2ea8ff",
    image: "night-shift",
    imagePosition: "30% 50%",
  },
  {
    id: "pendeta",
    title: "Pendeta Online",
    status: "Writing",
    progress: 58,
    color: "#2ea8ff",
    image: "crew-rooftop",
    imagePosition: "30% 50%",
  },
  {
    id: "allahi",
    title: "Allahi Promise",
    status: "Research",
    progress: 34,
    color: "#ffd21f",
    image: "mirror-archive",
    imagePosition: "50% 50%",
  },
  {
    id: "zill",
    title: "Zill",
    status: "Planning",
    progress: 18,
    color: "#a855f7",
    image: "crew-wall",
    imagePosition: "50% 35%",
  },
];

export const initialWorkflows: Workflow[] = [
  {
    id: "wf-1",
    name: "Content Analysis Agent",
    detail: "Scanning new sources…",
    status: "Running",
  },
  {
    id: "wf-2",
    name: "Poster Generation Batch",
    detail: "Creating visuals (12/15)…",
    status: "Running",
  },
  { id: "wf-3", name: "Fact Check Pipeline", detail: "Verifying 8 items…", status: "Running" },
  {
    id: "wf-4",
    name: "Cross-Post Scheduler",
    detail: "Preparing tomorrow's posts…",
    status: "Queued",
  },
  {
    id: "wf-5",
    name: "Research Signal Watcher",
    detail: "Monitoring global feeds…",
    status: "Running",
  },
];

export const feedItems: FeedItem[] = [
  {
    id: "f-1",
    text: "New signal detected: Climate movement in SE Asia",
    ago: "12m ago",
    color: "#a855f7",
  },
  { id: "f-2", text: "Chapter 12: Broken Sky updated", ago: "2h ago", color: "#2ea8ff" },
  { id: "f-3", text: "Poster set completed: PENDETA-ONLINE", ago: "4h ago", color: "#ff2d78" },
  {
    id: "f-4",
    text: "Source flagged for review (needs verification)",
    ago: "6h ago",
    color: "#ffd21f",
  },
  {
    id: "f-5",
    text: "AI workflow completed: Cultural Trends Report",
    ago: "8h ago",
    color: "#3ddc84",
  },
];

export const initialAlerts: MissionAlert[] = [
  { id: "a-1", text: "High volume of signals from MENA region", ago: "12m ago", level: "high" },
  { id: "a-2", text: "Source verification needed for 3 items", ago: "1h ago", level: "medium" },
  { id: "a-3", text: "Publishing queue delayed (2 items)", ago: "3h ago", level: "low" },
];

export const witnesses: Witness[] = [
  {
    id: "w-1",
    name: "Zill",
    place: "Bandung, ID",
    x: 74,
    y: 62,
    quote: "Every story must name the street it happened on.",
    signals: 41,
  },
  {
    id: "w-2",
    name: "Mara",
    place: "São Paulo, BR",
    x: 33,
    y: 68,
    quote: "The city speaks first. I just write it down.",
    signals: 27,
  },
  {
    id: "w-3",
    name: "Kenji",
    place: "Osaka, JP",
    x: 84,
    y: 38,
    quote: "Night shifts taught me who keeps the light on.",
    signals: 33,
  },
  {
    id: "w-4",
    name: "Amara",
    place: "Lagos, NG",
    x: 48,
    y: 58,
    quote: "Same moon over the market. Different stories every night.",
    signals: 19,
  },
  {
    id: "w-5",
    name: "Elias",
    place: "Berlin, DE",
    x: 51,
    y: 30,
    quote: "I archive what the news forgets by morning.",
    signals: 52,
  },
  {
    id: "w-6",
    name: "Nadia",
    place: "Casablanca, MA",
    x: 44,
    y: 42,
    quote: "The signal crossed the sea before I did.",
    signals: 24,
  },
  {
    id: "w-7",
    name: "Ravi",
    place: "Mumbai, IN",
    x: 66,
    y: 50,
    quote: "Six thousand witnesses. One sky. Keep going.",
    signals: 38,
  },
];

export const crewStats: { label: string; target: number }[] = [
  { label: "CREW MEMBERS", target: 1324 },
  { label: "COUNTRIES", target: 87 },
  { label: "SIGNALS", target: 6912 },
];

export const universeStats: UniverseStat[] = [
  { label: "STORIES ACTIVE", value: "12", trend: "+3 this week", tone: "pink" },
  { label: "EPISODES PUBLISHED", value: "48", trend: "+6 this month", tone: "blue" },
  { label: "COLLECTIONS LIVE", value: "6", trend: "2 curated", tone: "yellow" },
  { label: "TOTAL VIEWS", value: "3.2M", trend: "+18% vs last cycle", tone: "green" },
];

export const quickActions: QuickAction[] = [
  { id: "qa-episode", label: "NEW EPISODE", icon: "plus", moduleId: "story-forge" },
  { id: "qa-poster", label: "CREATE POSTER", icon: "image", moduleId: "poster-lab" },
  { id: "qa-story", label: "WRITE STORY", icon: "pen", moduleId: "story-forge" },
  { id: "qa-collection", label: "ADD TO COLLECTION", icon: "stack", moduleId: "publishing-hub" },
];

export const workspaceItems: WorkspaceItem[] = [
  {
    id: "ws-1",
    title: "The Batteries — Ep. 04 rough cut",
    kind: "PROJECT",
    updatedAt: "12m ago",
    status: "IN REVIEW",
  },
  {
    id: "ws-2",
    title: "Pendeta Online — script pass 2",
    kind: "STORY",
    updatedAt: "48m ago",
    status: "DRAFT",
  },
  {
    id: "ws-3",
    title: "Neon Cities poster set",
    kind: "SIGNAL",
    updatedAt: "2h ago",
    status: "READY",
  },
  {
    id: "ws-4",
    title: "Allahi Promise — source notes",
    kind: "RESEARCH",
    updatedAt: "5h ago",
    status: "APPROVED",
  },
  {
    id: "ws-5",
    title: "Zill — world bible v1",
    kind: "WORLD",
    updatedAt: "yesterday",
    status: "PUBLISHED",
  },
  {
    id: "ws-6",
    title: "Crew portraits batch 3",
    kind: "PEOPLE",
    updatedAt: "yesterday",
    status: "DRAFT",
  },
];

export const pipeline: PipelineColumn[] = [
  {
    stage: "DRAFT",
    count: 8,
    more: 5,
    items: [
      { id: "pl-1", title: "Batteries Ep.05 outline", type: "PROJECT", thumb: "night-shift" },
      { id: "pl-2", title: "Signal: MENA climate", type: "SIGNAL", thumb: "signal-sky" },
      { id: "pl-3", title: "Pendeta Online draft", type: "STORY", thumb: "crew-rooftop" },
    ],
  },
  {
    stage: "IN REVIEW",
    count: 4,
    more: 1,
    items: [
      { id: "pl-4", title: "Neon Cities ep.12", type: "WORLD", thumb: "city-shadow" },
      { id: "pl-5", title: "Poster set v3", type: "SIGNAL", thumb: "crew-wall" },
      { id: "pl-6", title: "Allahi Promise notes", type: "RESEARCH", thumb: "mirror-archive" },
    ],
  },
  {
    stage: "APPROVED",
    count: 6,
    more: 2,
    items: [
      { id: "pl-7", title: "Zill world bible", type: "WORLD", thumb: "crew-wall" },
      { id: "pl-8", title: "Crew portraits b3", type: "PEOPLE", thumb: "hero-witness" },
      { id: "pl-9", title: "Fracture ep.03", type: "PROJECT", thumb: "signal-tunnel" },
      { id: "pl-10", title: "Expansions teaser", type: "STORY", thumb: "crowd-moon" },
    ],
  },
  {
    stage: "PUBLISHED",
    count: 48,
    more: 44,
    items: [
      { id: "pl-11", title: "Origins ep.01", type: "PROJECT", thumb: "hero-witness" },
      { id: "pl-12", title: "Neon Cities ep.01", type: "WORLD", thumb: "city-shadow" },
      { id: "pl-13", title: "Rebuilding ep.01", type: "PEOPLE", thumb: "crowd-moon" },
      { id: "pl-14", title: "Signal log 001", type: "SIGNAL", thumb: "signal-tunnel" },
    ],
  },
];

export const collections: Collection[] = [
  { id: "col-1", name: "NEON CITIES", episodes: 12, cover: "city-shadow" },
  { id: "col-2", name: "THE FRACTURE", episodes: 8, cover: "signal-tunnel" },
  { id: "col-3", name: "CREW PORTRAITS", episodes: 18, cover: "crew-wall" },
  { id: "col-4", name: "EXPANSIONS", episodes: 10, cover: "crowd-moon" },
];

export const mapCities: MapCity[] = [
  { id: "london", city: "LONDON", x: 46, y: 30, signals: 412 },
  { id: "istanbul", city: "ISTANBUL", x: 55, y: 38, signals: 388 },
  { id: "seoul", city: "SEOUL", x: 80, y: 36, signals: 297 },
  { id: "cairo", city: "CAIRO", x: 54, y: 48, signals: 254 },
  { id: "tokyo", city: "TOKYO", x: 84, y: 40, signals: 501 },
  { id: "lagos", city: "LAGOS", x: 47, y: 57, signals: 366 },
  { id: "sao-paulo", city: "SÃO PAULO", x: 30, y: 70, signals: 198 },
  { id: "nairobi", city: "NAIROBI", x: 57, y: 60, signals: 233 },
];
