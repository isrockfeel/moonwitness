import { useRadioStore } from "../../stores/radio-store";
import { StationCard } from "../StationCard/StationCard";
import { useInfiniteStations } from "../../hooks/use-stations";

export function LivePage() {
  const { currentStation, audioState, play } = useRadioStore();
  const { isPlaying, isLoading } = audioState;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteStations({
    pageSize: 12,
  });

  const stations = data?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="space-y-8 p-4">
      {/* Hero / Current Playing */}
      {currentStation && (
        <div className="relative rounded-2xl overflow-hidden bg-surface-elevated">
          {currentStation.bannerUrl ? (
            <img
              src={currentStation.bannerUrl}
              alt=""
              className="w-full h-48 md:h-64 object-cover"
            />
          ) : (
            <div className="w-full h-48 md:h-64 flex items-center justify-center text-text-muted">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface shadow-xl">
                  {currentStation.logoUrl ? (
                    <img
                      src={currentStation.logoUrl}
                      alt={currentStation.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-accent font-medium uppercase tracking-wide">
                    Now Playing
                  </p>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {currentStation.name}
                  </h2>
                  <p className="text-text-muted">{currentStation.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-auto md:ml-0">
                <button
                  onClick={() => play(currentStation!)}
                  className="btn-primary px-8 py-3 text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  ) : isPlaying ? (
                    <>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                      <span className="ml-2">Pause</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="ml-2">Play Live</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Stations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Featured Stations</h2>
          <a href="/stations" className="text-sm text-primary hover:text-primary-hover">
            View all
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stations.slice(0, 8).map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      </div>

      {/* All Stations with Infinite Scroll */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">All Stations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stations.slice(8).map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>

        {hasNextPage && (
          <div ref={ref} className="flex justify-center py-4">
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
      </div>
    </div>
  );
}
