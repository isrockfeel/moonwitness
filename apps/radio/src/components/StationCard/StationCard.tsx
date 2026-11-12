import { Link } from "wouter";
import { useRadioStore } from "../../stores/radio-store";
import type { Station } from "../../types/radio";
import { formatNumber } from "../../lib/utils";

interface StationCardProps {
  station: Station;
  variant?: "default" | "compact";
}

export function StationCard({ station, variant = "default" }: StationCardProps) {
  const { isFavorite, toggleFavorite, play } = useRadioStore();
  const favorite = isFavorite(station.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    play(station);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(station.id);
  };

  if (variant === "compact") {
    return (
      <Link
        href={`/station/${station.slug}`}
        className="flex items-center gap-3 p-2 card hover:bg-surface-elevated/50 transition-colors"
      >
        <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-surface-elevated">
          {station.logoUrl ? (
            <img src={station.logoUrl} alt={station.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{station.name}</p>
          <p className="text-xs text-text-muted truncate">{station.description}</p>
        </div>
        <button
          onClick={handlePlayClick}
          className="btn-icon text-text-muted hover:text-primary"
          aria-label={`Play ${station.name}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </Link>
    );
  }

  return (
    <article className="station-card group">
      <Link href={`/station/${station.slug}`} className="block">
        <div className="aspect-square rounded-lg overflow-hidden bg-surface-elevated relative">
          {station.bannerUrl ? (
            <img
              src={station.bannerUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : station.logoUrl ? (
            <img
              src={station.logoUrl}
              alt={station.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handlePlayClick}
              className="btn-primary w-12 h-12 rounded-full"
              aria-label={`Play ${station.name}`}
            >
              <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              onClick={handleFavoriteClick}
              className={`btn-icon w-10 h-10 rounded-full bg-surface/80 backdrop-blur-sm ${favorite ? "text-accent" : "text-text-muted hover:text-accent"}`}
              aria-label={
                favorite
                  ? `Remove ${station.name} from favorites`
                  : `Add ${station.name} to favorites`
              }
            >
              <svg
                className="w-5 h-5"
                fill={favorite ? "currentColor" : "none"}
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
          </div>
        </div>
      </Link>

      <div className="flex-1 flex flex-col gap-1">
        <Link href={`/station/${station.slug}`} className="block">
          <h3 className="font-medium text-white truncate group-hover:text-primary transition-colors">
            {station.name}
          </h3>
        </Link>
        <p className="text-sm text-text-muted truncate">{station.description}</p>
        <div className="flex items-center gap-2 flex-wrap mt-auto">
          {station.genre.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="px-2 py-0.5 text-xs bg-surface rounded-full text-text-muted border border-border"
            >
              {genre}
            </span>
          ))}
          {station.genre.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-surface rounded-full text-text-muted border border-border">
              +{station.genre.length - 3}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span>{formatNumber(Math.floor(Math.random() * 10000))}</span>
        </div>
        <span className="text-xs text-text-muted uppercase tracking-wide">
          {station.country.toUpperCase()}
        </span>
      </div>
    </article>
  );
}
