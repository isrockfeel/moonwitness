export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
}

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: "M4 11 L12 4 L20 11 M6 10 L6 20 L18 20 L18 10",
  },
  {
    id: "mission-control",
    label: "Mission Control",
    href: "/mission-control",
    icon: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M12 8 A4 4 0 1 0 12 16 A4 4 0 1 0 12 8",
  },
  {
    id: "dock",
    label: "Project Universe",
    href: "/dock",
    icon: "M4 8 L12 4 L20 8 L20 16 L12 20 L4 16 Z M4 8 L12 12 L20 8 M12 12 L12 20",
  },
  {
    id: "story-forge",
    label: "Story Forge",
    href: "/mission-control?module=story-forge",
    icon: "M4 20 L6 14 L16 4 L20 8 L10 18 Z M14 6 L18 10",
  },
  {
    id: "poster-lab",
    label: "Poster Lab",
    href: "/mission-control?module=poster-lab",
    icon: "M4 5 L20 5 L20 19 L4 19 Z M4 15 L9 10 L14 15 L17 12 L20 15 M9 8.5 A0.5 0.5 0 1 0 9 8.5",
  },
  {
    id: "research-lab",
    label: "Research Lab",
    href: "/mission-control?module=research-lab",
    icon: "M10 3 L14 3 M11 3 L11 9 L5 19 Q4 21 7 21 L17 21 Q20 21 19 19 L13 9 L13 3 M8 15 L16 15",
  },
  {
    id: "world-monitor",
    label: "World Monitor",
    href: "/mission-control?module=world-monitor",
    icon: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M3 12 L21 12 M12 3 Q17 8 17 12 Q17 16 12 21 Q7 16 7 12 Q7 8 12 3",
  },
  {
    id: "publishing-hub",
    label: "Publishing Hub",
    href: "/mission-control?module=publishing-hub",
    icon: "M3 11 L21 3 L13 21 L10 14 Z M10 14 L21 3",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/shadow",
    icon: "M12 8 A4 4 0 1 0 12 16 A4 4 0 1 0 12 8 M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M5 5 L7 7 M17 17 L19 19 M19 5 L17 7 M7 17 L5 19",
  },
];
