import { useEffect } from "react";
import { useRadioStore } from "../../stores/radio-store";
import { StationCard } from "../StationCard/StationCard";
import { useInfiniteStations } from "../../hooks/use-stations";
import { SearchInput } from "../ui/SearchInput";
import { type ChangeEvent } from "react";

export function StationDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    stations,
    favoriteStationIds,
    searchQuery,
    setSearchQuery,
    selectedGenre,
    setSelectedGenre,
    selectedCountry,
    setSelectedCountry,
  } = useRadioStore();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteStations({
    genre: selectedGenre || undefined,
    search: searchQuery || undefined,
    pageSize: 20,
  });

  const allStations = data?.pages.flatMap((page) => page.items) || [];
  const filteredStations = allStations.filter((s) => s.isActive);

  const genres = [...new Set(stations.flatMap((s) => s.genre))].sort();
  const countries = [...new Set(stations.map((s) => s.country))].sort();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Stations">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-surface border-r border-border flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-white">Stations</h2>
          <button
            onClick={onClose}
            className="btn-icon text-text-muted hover:text-text"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search stations..."
            className="w-full"
          />
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border space-y-4">
          <div>
            <label className="text-sm font-medium text-text-muted mb-2 block">Genre</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${selectedGenre === null ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border hover:border-primary"}`}
              >
                All
              </button>
              {genres.slice(0, 10).map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${selectedGenre === genre ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border hover:border-primary"}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-muted mb-2 block">Country</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCountry(null)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${selectedCountry === null ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border hover:border-primary"}`}
              >
                All
              </button>
              {countries.slice(0, 10).map((country) => (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(country)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${selectedCountry === country ? "bg-primary text-white border-primary" : "bg-surface text-text-muted border-border hover:border-primary"}`}
                >
                  {country.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Favorites */}
        {favoriteStationIds.length > 0 && (
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Favorites
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredStations
                .filter((s) => favoriteStationIds.includes(s.id))
                .map((station) => (
                  <StationCard key={station.id} station={station} variant="compact" />
                ))}
            </div>
          </div>
        )}

        {/* Station List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredStations.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <svg
                className="w-12 h-12 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>No stations found</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filteredStations.map((station) => (
                  <StationCard key={station.id} station={station} variant="compact" />
                ))}
              </div>

              {hasNextPage && (
                <div className="flex justify-center py-4">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-text-muted">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Loading more...
                    </div>
                  ) : (
                    <button
                      className="btn-secondary"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      Load More
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-border bg-surface/50">
          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>{filteredStations.length} stations</span>
            <span>{favoriteStationIds.length} favorites</span>
          </div>
        </div>
      </div>
    </div>
  );
}
