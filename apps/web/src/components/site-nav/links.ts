export interface NavLink {
  id: string;
  label: string;
}

export const links: NavLink[] = [
  { id: "home", label: "HOME" },
  { id: "signals", label: "SIGNALS" },
  { id: "archive", label: "ARCHIVE" },
  { id: "crew", label: "CREW" },
  { id: "about", label: "ABOUT" },
];
