export type Era = {
  id: string;
  name: string;
  years: string;
  tagline: string;
  color: string;
};

export const eras: Era[] = [
  {
    id: "origins",
    name: "The Origins",
    years: "2018 – 2020",
    tagline: "A spark in the noise.",
    color: "#f4eede",
  },
  {
    id: "neon",
    name: "Neon Cities",
    years: "2021 – 2023",
    tagline: "Stories find a home.",
    color: "#ff2d78",
  },
  {
    id: "fracture",
    name: "The Fracture",
    years: "2024",
    tagline: "The sky breaks open.",
    color: "#2ea8ff",
  },
  {
    id: "rebuilding",
    name: "Rebuilding",
    years: "2025 – 2026",
    tagline: "People reconnect.",
    color: "#ffd21f",
  },
  {
    id: "expansions",
    name: "Expansions",
    years: "2027+",
    tagline: "New worlds. Same sky.",
    color: "#a855f7",
  },
];

export type DockEvent = {
  id: string;
  kind: "PROJECT" | "STORY" | "SIGNAL" | "WORLD" | "PEOPLE" | "RESEARCH";
  date: string;
  era: string;
  title: string;
  excerpt: string;
  body: string;
  location: string;
  tags: string[];
  sources: number;
  notes: number;
  image: string;
  imagePosition?: string;
  related: string[];
};

export const dockEvents: DockEvent[] = [
  {
    id: "moonwitness-born",
    kind: "PROJECT",
    date: "2018-07-14",
    era: "origins",
    title: "Moonwitness Is Born",
    excerpt: "First public signal. A small site, a big question.",
    body: "The first public signal from Moonwitness. A small site, a big question — can stories build a brighter tomorrow? One page, one moon, and an open call for curious humans everywhere.",
    location: "Global (Online)",
    tags: ["Founding", "Project", "Community"],
    sources: 12,
    notes: 3,
    image: "/art/city-shadow.png",
    imagePosition: "70% 40%",
    related: ["the-batteries", "zill-joins"],
  },
  {
    id: "the-batteries",
    kind: "STORY",
    date: "2020-11-03",
    era: "origins",
    title: "The Batteries",
    excerpt: "A ground story about power, people, and what keeps the city alive.",
    body: "A ground story about power, people, and what keeps the city alive. Follow the night-shift crews who trade sleep for light, and the small economies that hum beneath the skyline.",
    location: "Jakarta, ID",
    tags: ["Story", "City", "Energy"],
    sources: 8,
    notes: 5,
    image: "/art/hero-witness.png",
    imagePosition: "20% 30%",
    related: ["moonwitness-born", "skyline-broadcast"],
  },
  {
    id: "skyline-broadcast",
    kind: "SIGNAL",
    date: "2022-03-19",
    era: "neon",
    title: "Skyline Broadcast",
    excerpt: "Unidentified signal appears across multiple cities at the same time.",
    body: "An unidentified signal appears across multiple cities at the same time. Witnesses in nine timezones report the same phrase written in light. Verification ongoing; the pattern refuses to repeat.",
    location: "9 cities, worldwide",
    tags: ["Signal", "Unverified", "Sky"],
    sources: 15,
    notes: 7,
    image: "/art/crew-rooftop.png",
    imagePosition: "50% 20%",
    related: ["the-batteries", "the-fracture"],
  },
  {
    id: "the-fracture",
    kind: "WORLD",
    date: "2024-01-28",
    era: "fracture",
    title: "The Fracture",
    excerpt: "Global communications disrupted. New worlds suddenly visible.",
    body: "Global communications disrupted for 71 hours. When the networks returned, new worlds were suddenly visible — communities that had been broadcasting into the noise finally heard each other.",
    location: "Global",
    tags: ["World", "Event", "Networks"],
    sources: 25,
    notes: 11,
    image: "/art/signal-tunnel.png",
    imagePosition: "50% 45%",
    related: ["skyline-broadcast", "zill-joins"],
  },
  {
    id: "zill-joins",
    kind: "PEOPLE",
    date: "2025-06-02",
    era: "rebuilding",
    title: "Zill Joins the Dock",
    excerpt: "Independent creator Zill begins sharing field notes and visuals.",
    body: "Independent creator Zill begins sharing field notes and visuals from the rebuilt districts. Her rule: every story must name the street it happened on. The archive gets sharper overnight.",
    location: "Bandung, ID",
    tags: ["People", "Creator", "Field Notes"],
    sources: 6,
    notes: 4,
    image: "/art/hero-witness.png",
    imagePosition: "35% 20%",
    related: ["the-fracture", "allahhi-promise"],
  },
  {
    id: "allahhi-promise",
    kind: "RESEARCH",
    date: "2026-02-17",
    era: "rebuilding",
    title: "Allahi Promise",
    excerpt: "Community research initiative launched to map new signals and cultures.",
    body: "A community research initiative launched to map new signals and cultures. Forty-six active signals in the first month, each one verified by at least two witnesses who have never met.",
    location: "Global (Online)",
    tags: ["Research", "Community", "Mapping"],
    sources: 18,
    notes: 9,
    image: "/art/city-shadow.png",
    imagePosition: "80% 60%",
    related: ["zill-joins", "pendeta-online"],
  },
  {
    id: "pendeta-online",
    kind: "STORY",
    date: "2025-09-30",
    era: "rebuilding",
    title: "Pendeta Online",
    excerpt: "A street preacher builds a congregation of night-shift workers.",
    body: "A street preacher builds a congregation of night-shift workers, streaming sermons between freight trains. A story about faith at 3AM and the people who keep the city honest.",
    location: "Surabaya, ID",
    tags: ["Story", "Faith", "Night Shift"],
    sources: 9,
    notes: 6,
    image: "/art/crew-rooftop.png",
    imagePosition: "30% 55%",
    related: ["allahhi-promise", "cities-never-sleep"],
  },
  {
    id: "cities-never-sleep",
    kind: "SIGNAL",
    date: "2023-03-08",
    era: "neon",
    title: "Cities Never Sleep",
    excerpt: "A 24-hour relay of witnesses documents one full rotation of the planet.",
    body: "A 24-hour relay of witnesses documents one full rotation of the planet. Every hour, a different city hands the signal to the next. The archive gains its first continuous day.",
    location: "24 cities, worldwide",
    tags: ["Signal", "Relay", "Global"],
    sources: 24,
    notes: 12,
    image: "/art/city-shadow.png",
    imagePosition: "55% 30%",
    related: ["skyline-broadcast", "pendeta-online"],
  },
  {
    id: "voices-in-the-fog",
    kind: "STORY",
    date: "2024-11-12",
    era: "fracture",
    title: "Voices in the Fog",
    excerpt: "Audio letters from a mountain town cut off by the Fracture.",
    body: "Audio letters from a mountain town cut off by the Fracture. Recorded on borrowed phones, carried down on foot, uploaded one by one. The town speaks; the network listens.",
    location: "Dieng, ID",
    tags: ["Story", "Audio", "Isolation"],
    sources: 7,
    notes: 8,
    image: "/art/signal-tunnel.png",
    imagePosition: "50% 60%",
    related: ["the-fracture", "the-other-side"],
  },
  {
    id: "the-other-side",
    kind: "WORLD",
    date: "2025-01-05",
    era: "rebuilding",
    title: "The Other Side",
    excerpt: "A mirror archive opens for stories that were never told the first time.",
    body: "A mirror archive opens for stories that were never told the first time. Same events, different witnesses. The rule of the house: no story gets deleted for being inconvenient.",
    location: "Global (Online)",
    tags: ["World", "Archive", "Memory"],
    sources: 14,
    notes: 5,
    image: "/art/hero-witness.png",
    imagePosition: "60% 45%",
    related: ["voices-in-the-fog", "brighter-question"],
  },
  {
    id: "brighter-question",
    kind: "RESEARCH",
    date: "2025-04-22",
    era: "rebuilding",
    title: "A Brighter Question",
    excerpt: "Can stories build a brighter tomorrow? The network answers with data.",
    body: "Can stories build a brighter tomorrow? The network answers with data: 87 countries, 6,912 signals, and a measurable rise in cross-border collaboration wherever the archive is read.",
    location: "Global",
    tags: ["Research", "Impact", "Data"],
    sources: 31,
    notes: 14,
    image: "/art/crew-rooftop.png",
    imagePosition: "50% 35%",
    related: ["the-other-side", "shadow-grows"],
  },
  {
    id: "shadow-grows",
    kind: "SIGNAL",
    date: "2026-06-15",
    era: "rebuilding",
    title: "The Shadow Grows",
    excerpt: "Membership crosses six thousand. The private layer deepens.",
    body: "Membership crosses six thousand. The private layer deepens: a command center for stories, research, posters, and publishing. Not everything is visible — and that is the point.",
    location: "Global (Online)",
    tags: ["Signal", "Crew", "Milestone"],
    sources: 11,
    notes: 7,
    image: "/art/city-shadow.png",
    imagePosition: "75% 55%",
    related: ["brighter-question", "new-worlds"],
  },
  {
    id: "new-worlds",
    kind: "PROJECT",
    date: "2027-01-01",
    era: "expansions",
    title: "New Worlds, Same Sky",
    excerpt: "The expansion roadmap: new languages, new cities, one moon.",
    body: "The expansion roadmap: new languages, new cities, one moon. The Dock opens its timeline to public contribution, and the first witness-led chapter launches in São Paulo.",
    location: "São Paulo, BR",
    tags: ["Project", "Expansion", "Future"],
    sources: 5,
    notes: 2,
    image: "/art/crew-rooftop.png",
    imagePosition: "60% 25%",
    related: ["shadow-grows"],
  },
];

export const kindColors: Record<DockEvent["kind"], string> = {
  PROJECT: "#ff2d78",
  STORY: "#2ea8ff",
  SIGNAL: "#ffd21f",
  WORLD: "#a855f7",
  PEOPLE: "#ff2d78",
  RESEARCH: "#2ea8ff",
};

export type Module = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  stats: { label: string; value: number; color: string }[];
};

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

export type Project = {
  id: string;
  title: string;
  status: "Active" | "Writing" | "Research" | "Planning";
  progress: number;
  color: string;
  image: string;
  imagePosition: string;
};

export const projects: Project[] = [
  {
    id: "batteries",
    title: "The Batteries",
    status: "Active",
    progress: 72,
    color: "#2ea8ff",
    image: "/art/hero-witness.png",
    imagePosition: "25% 25%",
  },
  {
    id: "pendeta",
    title: "Pendeta Online",
    status: "Writing",
    progress: 58,
    color: "#2ea8ff",
    image: "/art/crew-rooftop.png",
    imagePosition: "30% 50%",
  },
  {
    id: "allahi",
    title: "Allahi Promise",
    status: "Research",
    progress: 34,
    color: "#ffd21f",
    image: "/art/city-shadow.png",
    imagePosition: "80% 55%",
  },
  {
    id: "zill",
    title: "Zill",
    status: "Planning",
    progress: 18,
    color: "#a855f7",
    image: "/art/hero-witness.png",
    imagePosition: "40% 15%",
  },
];

export type Workflow = {
  id: string;
  name: string;
  detail: string;
  status: "Running" | "Queued" | "Paused";
};

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

export type FeedItem = { id: string; text: string; ago: string; color: string };

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

export type Alert = { id: string; text: string; ago: string; level: "high" | "medium" | "low" };

export const initialAlerts: Alert[] = [
  { id: "a-1", text: "High volume of signals from MENA region", ago: "12m ago", level: "high" },
  { id: "a-2", text: "Source verification needed for 3 items", ago: "1h ago", level: "medium" },
  { id: "a-3", text: "Publishing queue delayed (2 items)", ago: "3h ago", level: "low" },
];

export type Witness = {
  id: string;
  name: string;
  place: string;
  x: number;
  y: number;
  quote: string;
  signals: number;
};

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
