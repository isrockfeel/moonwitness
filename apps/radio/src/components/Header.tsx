import { Link, useLocation } from 'wouter';
import { useRadioStore } from '../stores/radio-store';
import { SearchInput } from './ui/SearchInput';
import { MenuButton } from './ui/MenuButton';

export function Header() {
  const [, navigate] = useLocation();
  const { searchQuery, setSearchQuery, setStationDrawerOpen, isStationDrawerOpen } = useRadioStore();

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setStationDrawerOpen(true)} className="md:hidden" aria-label="Open menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </MenuButton>
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-text">
              <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <span className="hidden sm:block">Moonwitness Radio</span>
            </Link>
          </div>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search stations..."
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Link href="/stations" className="btn-ghost text-sm hidden sm:flex">
              Stations
            </Link>
            <Link href="/live" className="btn-primary text-sm hidden sm:flex">
              Live Now
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search stations..."
            className="w-full"
          />
        </div>
      </div>
    </header>
  );
}