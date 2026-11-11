export type NavTarget =
  /** Pindah route biasa. */
  | { kind: "route"; href: string }
  /** Scroll ke anchor. href = halaman pemilik anchor; Next menangani hash lintas halaman. */
  | { kind: "section"; href: string; anchor: string }
  /** Buka drawer modul. href = halaman pemilik drawer + query ?module=<id>. */
  | { kind: "module"; href: string; moduleId: string };

export interface NavItem {
  id: string;
  label: string;
  icon: string; // path stroke SVG
  target: NavTarget;
}

export function navHref(item: NavItem): string {
  switch (item.target.kind) {
    case "route":
      return item.target.href;
    case "section":
      return `${item.target.href}#${item.target.anchor}`;
    case "module":
      return `${item.target.href}?module=${item.target.moduleId}`;
  }
}

const ACTIVE_BY_PATH: Record<string, string> = {
  "/dock": "archive",
  "/mission-control": "dashboard",
  "/episodes": "episodes",
  "/studios": "research",
  "/studios/story-forge": "story-studio",
  "/studios/poster-lab": "poster-forge",
  "/collections": "collections",
  "/research": "research",
  "/crew": "crew",
  "/log": "mission-log",
  "/shadow": "settings",
  "/settings": "settings",
  "/id-lab": "id-lab",
  "/control": "control",
};

export function activeByPath(pathname: string): string {
  if (ACTIVE_BY_PATH[pathname]) return ACTIVE_BY_PATH[pathname];
  for (const [route, id] of Object.entries(ACTIVE_BY_PATH)) {
    if (pathname.startsWith(route)) return id;
  }
  return "";
}

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "M4 11 L12 4 L20 11 M6 10 L6 20 L18 20 L18 10",
    target: { kind: "route", href: "/mission-control" },
  },
  {
    id: "story-studio",
    label: "Story Studio",
    icon: "M4 20 L6 14 L16 4 L20 8 L10 18 Z M14 6 L18 10",
    target: { kind: "route", href: "/studios/story-forge" },
  },
  {
    id: "episodes",
    label: "Episodes",
    icon: "M4 5 L20 5 L20 19 L4 19 Z M8 9 L16 9 M8 13 L13 13",
    target: { kind: "route", href: "/episodes" },
  },
  {
    id: "poster-forge",
    label: "Poster Forge",
    icon: "M4 5 L20 5 L20 19 L4 19 Z M4 15 L9 10 L14 15 L17 12 L20 15 M9 8.5 A0.5 0.5 0 1 0 9 8.5",
    target: { kind: "route", href: "/studios/poster-lab" },
  },
  {
    id: "collections",
    label: "Collections",
    icon: "M4 7 L12 3 L20 7 L12 11 Z M4 12 L12 16 L20 12 M4 17 L12 21 L20 17",
    target: { kind: "route", href: "/collections" },
  },
  {
    id: "research",
    label: "Research",
    icon: "M10 3 L14 3 M11 3 L11 9 L5 19 Q4 21 7 21 L17 21 Q20 21 19 19 L13 9 L13 3 M8 15 L16 15",
    target: { kind: "route", href: "/research" },
  },
  {
    id: "crew",
    label: "Crew",
    icon: "M9 11 A3.5 3.5 0 1 0 9 4 A3.5 3.5 0 1 0 9 11 M2 20 Q2 15 9 15 Q16 15 16 20 M17 11 A3 3 0 1 0 17 5 M18 20 Q18 16 22 16",
    target: { kind: "route", href: "/crew" },
  },
  {
    id: "mission-log",
    label: "Mission Log",
    icon: "M5 4 L19 4 L19 20 L5 20 Z M8 8 L16 8 M8 12 L16 12 M8 16 L13 16",
    target: { kind: "route", href: "/log" },
  },
  {
    id: "id-lab",
    label: "ID Lab",
    icon: "M12 11 A4 4 0 1 0 12 3 A4 4 0 1 0 12 11 M4 21 Q4 15 12 15 Q20 15 20 21 M17 4 L18 2 L19 4 L21 5 L19 6 L18 8 L17 6 L15 5 Z",
    target: { kind: "route", href: "/id-lab" },
  },
  {
    id: "archive",
    label: "Archive",
    icon: "M4 8 L12 4 L20 8 L20 16 L12 20 L4 16 Z M4 8 L12 12 L20 8 M12 12 L12 20",
    target: { kind: "route", href: "/dock" },
  },
  {
    id: "control",
    label: "Control Plane",
    icon: "M4 7 L20 7 M4 12 L20 12 M4 17 L20 17 M7 7 A1.5 1.5 0 1 0 7 7 M15 12 A1.5 1.5 0 1 0 15 12 M10 17 A1.5 1.5 0 1 0 10 17",
    target: { kind: "route", href: "/control" },
  },
  {
    id: "settings",
    label: "Settings",
    icon: "M12 8 A4 4 0 1 0 12 16 A4 4 0 1 0 12 8 M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M5 5 L7 7 M17 17 L19 19 M19 5 L17 7 M7 17 L5 19",
    target: { kind: "route", href: "/shadow" },
  },
];
