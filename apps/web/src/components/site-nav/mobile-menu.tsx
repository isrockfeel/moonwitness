import Link from "next/link";
import type { NavLink } from "./links";

export interface MobileMenuProps {
  links: NavLink[];
  active: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function MobileMenu({ links, active, onSelect, onClose }: MobileMenuProps) {
  return (
    <nav
      className="border-t border-[var(--line)] bg-[var(--ink)] px-4 py-3 lg:hidden"
      aria-label="Mobile"
    >
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          onClick={() => {
            onSelect(link.id);
            onClose();
          }}
          className={`block px-2 py-2.5 font-brush text-lg ${active === link.id ? "text-[var(--pink)]" : "text-zinc-200"}`}
        >
          {link.label}
        </a>
      ))}
      <Link href="/shadow" onClick={onClose} className="btn-zine mt-2 px-5 py-2.5 text-base">
        JOIN THE CREW →
      </Link>
    </nav>
  );
}
