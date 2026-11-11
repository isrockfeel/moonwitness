export type NavItemBadgeTone = "pink" | "yellow" | "hazard" | "cyan";

export interface NavLink {
  id: string;
  title: string;
  path: string;
  icon: string;
  badge?: string;
  badgeTone?: NavItemBadgeTone;
  disabled?: boolean;
}

export interface NavSectionTitle {
  sectionTitle: string;
  tag?: string;
  children: NavLink[];
}

export type VerticalNavItems = NavSectionTitle[];

/**
 * Vuexy Standard Vertical Navigation Model
 * Categorized, typed, and centralized for clean architectural separation.
 */
export const verticalNavigation: VerticalNavItems = [
  {
    sectionTitle: "BROADCAST CORE",
    tag: "LIVE // CH-01",
    children: [
      {
        id: "dashboard",
        title: "Mission Control",
        path: "/mission-control",
        icon: "M4 11 L12 4 L20 11 M6 10 L6 20 L18 20 L18 10",
      },
      {
        id: "episodes",
        title: "Episode Pipeline",
        path: "/episodes",
        icon: "M4 5 L20 5 L20 19 L4 19 Z M8 9 L16 9 M8 13 L13 13",
        badge: "KANBAN",
        badgeTone: "hazard",
      },
      {
        id: "dock",
        title: "Dock Evidence",
        path: "/dock",
        icon: "M4 8 L12 4 L20 8 L20 16 L12 20 L4 16 Z M4 8 L12 12 L20 8 M12 12 L12 20",
      },
      {
        id: "collections",
        title: "Vault Collections",
        path: "/collections",
        icon: "M4 7 L12 3 L20 7 L12 11 Z M4 12 L12 16 L20 12 M4 17 L12 21 L20 17",
      },
    ],
  },
  {
    sectionTitle: "UNDERGROUND STUDIOS",
    tag: "LABS // PROD",
    children: [
      {
        id: "story-studio",
        title: "Story Forge",
        path: "/studios/story-forge",
        icon: "M4 20 L6 14 L16 4 L20 8 L10 18 Z M14 6 L18 10",
      },
      {
        id: "poster-forge",
        title: "Poster Lab",
        path: "/studios/poster-lab",
        icon: "M4 5 L20 5 L20 19 L4 19 Z M4 15 L9 10 L14 15 L17 12 L20 15 M9 8.5 A0.5 0.5 0 1 0 9 8.5",
        badge: "RAW",
        badgeTone: "pink",
      },
      {
        id: "research",
        title: "Field Research",
        path: "/research",
        icon: "M10 3 L14 3 M11 3 L11 9 L5 19 Q4 21 7 21 L17 21 Q20 21 19 19 L13 9 L13 3 M8 15 L16 15",
      },
      {
        id: "id-lab",
        title: "ID Lab & Avatars",
        path: "/id-lab",
        icon: "M12 11 A4 4 0 1 0 12 3 A4 4 0 1 0 12 11 M4 21 Q4 15 12 15 Q20 15 20 21 M17 4 L18 2 L19 4 L21 5 L19 6 L18 8 L17 6 L15 5 Z",
      },
    ],
  },
  {
    sectionTitle: "INFRASTRUCTURE & MESH",
    tag: "ROOT // SEC-0",
    children: [
      {
        id: "paas",
        title: "PaaS Platform",
        path: "/paas",
        icon: "M4 7 L20 7 M4 12 L20 12 M4 17 L20 17 M7 7 A1.5 1.5 0 1 0 7 7 M15 12 A1.5 1.5 0 1 0 15 12 M10 17 A1.5 1.5 0 1 0 10 17",
        badge: "ARSY",
        badgeTone: "yellow",
      },
      {
        id: "vpn",
        title: "VPN Tunnel / Mesh",
        path: "/vpn",
        icon: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M3 12 L21 12 M12 3 Q17 12 12 21 Q7 12 12 3",
        badge: "WIREGUARD",
        badgeTone: "pink",
      },
    ],
  },
  {
    sectionTitle: "CREW & TERMINAL",
    tag: "AUTH // SYS",
    children: [
      {
        id: "crew",
        title: "Empire Crew",
        path: "/crew",
        icon: "M9 11 A3.5 3.5 0 1 0 9 4 A3.5 3.5 0 1 0 9 11 M2 20 Q2 15 9 15 Q16 15 16 20 M17 11 A3 3 0 1 0 17 5 M18 20 Q18 16 22 16",
      },
      {
        id: "mission-log",
        title: "Audit Mission Log",
        path: "/log",
        icon: "M5 4 L19 4 L19 20 L5 20 Z M8 8 L16 8 M8 12 L16 12 M8 16 L13 16",
      },
      {
        id: "settings",
        title: "Shadow Auth Gate",
        path: "/shadow",
        icon: "M12 8 A4 4 0 1 0 12 16 A4 4 0 1 0 12 8 M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M5 5 L7 7 M17 17 L19 19 M19 5 L17 7 M7 17 L5 19",
      },
    ],
  },
];
