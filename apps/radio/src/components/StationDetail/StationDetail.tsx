import { useParams, Link } from "wouter";
import { useStation } from "../../hooks/use-stations";
import { useNowPlaying, useListenerCount, useSchedule } from "../../hooks/use-stations";
import { useNowPlayingWebSocket, useListenerCountWebSocket } from "../../hooks/use-websocket";
import { useRadioStore } from "../../stores/radio-store";
import { StationCard } from "../StationCard/StationCard";
import { Skeleton } from "../ui/Skeleton";
import { formatTime } from "../../lib/utils";
import type { Station } from "../../types/radio";

export function StationDetail() {
  const params = useParams();
  const slug = params.slug;
  const { play, isFavorite, toggleFavorite } = useRadioStore();

  const { data: station, isLoading: stationLoading, error: stationError } = useStation(slug || "");
  const { data: nowPlaying, isLoading: npLoading } = useNowPlaying(station?.id || "");
  const { data: listenerCount } = useListenerCount(station?.id || "");
  const { data: schedule } = useSchedule(station?.id || "");
  const { track: wsTrack } = useNowPlayingWebSocket(station?.id || null);
  const { count: wsCount } = useListenerCountWebSocket(station?.id || null);

  const currentTrack = wsTrack || nowPlaying;
  const currentListeners = wsCount || listenerCount?.count || 0;

  if (stationLoading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (stationError || !station) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-text mb-2">Station not found</h2>
        <Link href="/stations" className="btn-primary inline-block">
          Browse Stations
        </Link>
      </div>
    );
  }

  const handlePlayClick = () => play(station);

  return (
    <div className="p-4 space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-surface-elevated">
        {station.bannerUrl ? (
          <img src={station.bannerUrl} alt="" className="w-full h-64 md:h-80 object-cover" />
        ) : (
          <div className="w-full h-64 md:h-80 flex items-center justify-center text-text-muted">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-elevated shadow-xl">
                {station.logoUrl ? (
                  <img
                    src={station.logoUrl}
                    alt={station.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{station.name}</h1>
                <p className="text-text-muted">{station.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {currentListeners.toLocaleString()} listeners
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                    {station.country.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    {station.language}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto md:ml-0">
              <button
                onClick={handlePlayClick}
                className="btn-primary px-8 py-3 text-lg"
                disabled={npLoading}
              >
                {npLoading ? (
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
                ) : (
                  <>
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="ml-2">Play</span>
                  </>
                )}
              </button>
              <button
                onClick={() => toggleFavorite(station.id)}
                className={`btn-icon w-12 h-12 ${isFavorite(station.id) ? "text-accent" : "text-text-muted hover:text-accent"}`}
                aria-label={isFavorite(station.id) ? "Remove from favorites" : "Add to favorites"}
              >
                <svg
                  className="w-6 h-6"
                  fill={isFavorite(station.id) ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
              <button
                className="btn-icon w-12 h-12 text-text-muted hover:text-text"
                aria-label="Share station"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Now Playing */}
      {currentTrack && (
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface flex-shrink-0">
              {currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-white truncate">{currentTrack.title}</h3>
                {currentTrack.isLive && (
                  <span className="flex items-center gap-1 text-xs text-accent animate-pulse-soft">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-sm text-text-muted truncate">{currentTrack.artist}</p>
              {currentTrack.album && (
                <p className="text-xs text-text-muted truncate">{currentTrack.album}</p>
              )}
            </div>
            {currentTrack.externalUrls && (
              <div className="flex items-center gap-2">
                {currentTrack.externalUrls.spotify && (
                  <a
                    href={currentTrack.externalUrls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-icon text-text-muted hover:text-green-500"
                    aria-label="Open on Spotify"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                )}
                {currentTrack.externalUrls.appleMusic && (
                  <a
                    href={currentTrack.externalUrls.appleMusic}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-icon text-text-muted hover:text-red-500"
                    aria-label="Open on Apple Music"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12C24 5.373 18.627 0 12 0zm5.521 17.34c-.617.35-1.27.525-1.924.525-1.337 0-2.426-.879-2.837-2.082l-1.433 1.433c.754 1.88 2.69 3.278 4.87 3.278 3.866 0 7-3.134 7-7s-3.134-7-7-7c-2.18 0-4.116 1.398-4.87 3.278l1.433 1.433c.411-1.203 1.5-2.082 2.837-2.082 1.975 0 3.573 1.598 3.573 3.573 0 .654-.175 1.308-.525 1.924l3.076 3.077z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Genres */}
      <div className="card p-4">
        <h3 className="font-medium text-white mb-3">Genres</h3>
        <div className="flex flex-wrap gap-2">
          {station.genre.map((genre) => (
            <span
              key={genre}
              className="px-3 py-1 text-sm bg-surface rounded-full text-text-muted border border-border"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* Schedule */}
      {schedule && schedule.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-white">Upcoming Schedule</h3>
            <Link
              href={`/station/${station.slug}/schedule`}
              className="text-sm text-primary hover:text-primary-hover"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {schedule.slice(0, 10).map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-2 hover:bg-surface rounded-lg transition-colors"
              >
                <div className="w-10 h-10 rounded overflow-hidden bg-surface-elevated flex-shrink-0">
                  {track.artworkUrl ? (
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{track.title}</p>
                  <p className="text-xs text-text-muted truncate">{track.artist}</p>
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap">
                  {formatTime(track.startTime)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar Stations */}
      <div>
        <h3 className="font-medium text-white mb-4">Similar Stations</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {station.genre
            .slice(0, 1)
            .flatMap((_genre) => [
              {
                ...station,
                id: `${station.id}-1`,
                name: `${station.name} 2`,
                slug: `${station.slug}-2`,
              },
              {
                ...station,
                id: `${station.id}-2`,
                name: `${station.name} 3`,
                slug: `${station.slug}-3`,
              },
              {
                ...station,
                id: `${station.id}-3`,
                name: `${station.name} 4`,
                slug: `${station.slug}-4`,
              },
            ])
            .map((similarStation) => (
              <StationCard key={similarStation.id} station={similarStation as Station} />
            ))}
        </div>
      </div>
    </div>
  );
}
