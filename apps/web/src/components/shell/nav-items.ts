import { verticalNavigation, type NavLink } from "@/navigation";

export type NavTarget =
  | { kind: "route"; href: string }
  | { kind: "section"; href: string; anchor: string }
  | { kind: "module"; href: string; moduleId: string };

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  target: NavTarget;
  badge?: string;
  badgeTone?: "pink" | "yellow" | "hazard" | "cyan";
}

export interface NavGroup {
  id: string;
  title: string;
  tag: string;
  items: NavItem[];
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

/** Mapping adapter from Vuexy navigation model to shell component representation */
export const navigationGroups: NavGroup[] = verticalNavigation.map((section, idx) => ({
  id: `group-${idx}`,
  title: section.sectionTitle,
  tag: section.tag ?? "SECTION",
  items: section.children.map((child: NavLink) => ({
    id: child.id,
    label: child.title,
    icon: child.icon,
    target: { kind: "route", href: child.path },
    badge: child.badge,
    badgeTone: child.badgeTone,
  })),
}));

export const navItems: NavItem[] = navigationGroups.flatMap((group) => group.items);

export function activeByPath(pathname: string): string {
  for (const group of navigationGroups) {
    for (const item of group.items) {
      if (item.target.kind === "route" && (pathname === item.target.href || pathname.startsWith(item.target.href + "/"))) {
        return item.id;
      }
    }
  }
  return "";
}
