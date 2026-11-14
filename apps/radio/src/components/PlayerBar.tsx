import { useEffect, useCallback } from "react";
import { useRadioStore } from "../stores/radio-store";
import { formatTime } from "../lib/utils";

export function PlayerBar() {
  const {
    audioState,
    currentStation,
    togglePlay,
    setVolume,
    seek,
    setPlayerExpanded,
    isPlayerExpanded,
  } = useRadioStore();

  const { isPlaying, currentTrack, volume, currentTime, duration, buffered, isLoading, error } =
    audioState;

  useEffect(() => {
    if (currentStation && !isPlayerExpanded) {
      setPlayerExpanded(true);
    }
  }, [currentStation, isPlayerExpanded, setPlayerExpanded]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        e.preventDefault();
        seek(Math.max(0, currentTime - 10));
        break;
      case "ArrowRight":
        e.preventDefault();
        seek(Math.min(duration, currentTime + 10));
        break;
      case "ArrowUp":
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.1));
        break;
      case "ArrowDown":
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.1));
        break;
      case "m":
        e.preventDefault();
        setVolume(volume > 0 ? 0 : 1);
        break;
    }
  }, [togglePlay, seek, setVolume, currentTime, duration, volume]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKeyDown]);

  if (!currentStation) return null;

  return (
    <div className="player-bar" role="region" aria-label="Audio player">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Artwork */}
          <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-surface-elevated">
            {currentTrack?.artworkUrl || currentStation.logoUrl ? (
              <img
                src={currentTrack?.artworkUrl || currentStation.logoUrl}
                alt={currentTrack?.title || currentStation.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
            {isPlaying && !isLoading && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
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
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white truncate">
                {currentTrack?.title || currentStation.name}
              </p>
              {currentTrack?.isLive && (
                <span className="flex items-center gap-1 text-xs text-accent animate-pulse-soft">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted truncate">
              {currentTrack?.artist || currentStation.description}
            </p>
            {error && <p className="text-xs text-error mt-1">{error}</p>}
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3 w-full max-w-md hidden sm:flex">
            <span className="text-xs text-text-muted w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-1.5 bg-border rounded-full relative overflow-hidden"
              role="slider"
              aria-label="Playback progress"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
              tabIndex={0}
            >
              {buffered > 0 && (
                <div
                  className="absolute top-0 left-0 h-full bg-primary/30 rounded-full"
                  style={{ width: `${(buffered / duration) * 100}%` }}
                />
              )}
              <div
                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer focus:outline-none"
                aria-label="Seek"
              />
            </div>
            <span className="text-xs text-text-muted w-10">{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              className="btn-icon text-text-muted hover:text-text"
              onClick={() => seek(Math.max(0, currentTime - 15))}
              aria-label="Rewind 15 seconds"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              className="btn-icon w-12 h-12 rounded-full bg-primary text-white hover:bg-primary-hover"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              className="btn-icon text-text-muted hover:text-text"
              onClick={() => seek(Math.min(duration, currentTime + 15))}
              aria-label="Forward 15 seconds"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 hidden lg:flex">
            <button
              className="btn-icon text-text-muted hover:text-text"
              onClick={() => setVolume(volume > 0 ? 0 : 1)}
              aria-label={volume > 0 ? "Mute" : "Unmute"}
            >
              {volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : volume < 0.5 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-1.5 appearance-none bg-border rounded-full accent-primary cursor-pointer"
              aria-label="Volume"
            />
          </div>
        </div>

        {/* Mobile progress bar */}
        <div className="sm:hidden mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 h-1.5 bg-border rounded-full relative overflow-hidden">
              {buffered > 0 && (
                <div
                  className="absolute top-0 left-0 h-full bg-primary/30 rounded-full"
                  style={{ width: `${(buffered / duration) * 100}%` }}
                />
              )}
              <div
                className="absolute top-0 left-0 h-full bg-primary rounded-full"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleProgressChange}
                className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer"
              />
            </div>
            <span className="text-xs text-text-muted w-10">{formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              className="btn-icon text-text-muted hover:text-text"
              onClick={() => setVolume(volume > 0 ? 0 : 1)}
              aria-label={volume > 0 ? "Mute" : "Unmute"}
            >
              {volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1.5 appearance-none bg-border rounded-full accent-primary cursor-pointer"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
