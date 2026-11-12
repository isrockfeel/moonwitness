import { useRadioStore } from "../../stores/radio-store";

export function SettingsPage() {
  const { audioState, setVolume } = useRadioStore();
  const { volume } = audioState;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleClearCache = () => {
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    localStorage.removeItem("moonwitness-radio-storage");
    window.location.reload();
  };

  const handleExportData = () => {
    const data = {
      favorites: useRadioStore.getState().favoriteStationIds,
      volume: useRadioStore.getState().audioState.volume,
      searchQuery: useRadioStore.getState().searchQuery,
      selectedGenre: useRadioStore.getState().selectedGenre,
      selectedCountry: useRadioStore.getState().selectedCountry,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "moonwitness-radio-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Audio Settings */}
      <section className="card p-6 space-y-6">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z"
            />
          </svg>
          Audio
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Volume</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 appearance-none bg-border rounded-full accent-primary cursor-pointer"
              />
              <span className="text-sm text-text-muted w-12 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                defaultChecked
              />
              <span className="text-sm text-text">Normalize volume across stations</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                defaultChecked
              />
              <span className="text-sm text-text">Auto-play next station when current ends</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">Crossfade between tracks</span>
            </label>
          </div>
        </div>
      </section>

      {/* Playback Settings */}
      <section className="card p-6 space-y-6">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Playback
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Stream Quality</label>
            <select className="input" defaultValue="auto">
              <option value="auto">Auto (Adaptive)</option>
              <option value="high">High (320 kbps)</option>
              <option value="medium">Medium (128 kbps)</option>
              <option value="low">Low (64 kbps)</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                defaultChecked
              />
              <span className="text-sm text-text">Prefer native HLS playback (Safari)</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                defaultChecked
              />
              <span className="text-sm text-text">Enable background playback</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">Show media controls on lock screen</span>
            </label>
          </div>
        </div>
      </section>

      {/* Data & Privacy */}
      <section className="card p-6 space-y-6">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Data & Privacy
        </h2>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">Allow analytics (anonymous)</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">Save listening history locally</span>
            </label>
          </div>
          <button onClick={handleClearCache} className="btn-secondary">
            Clear Cache & Local Data
          </button>
          <button onClick={handleExportData} className="btn-secondary">
            Export Settings
          </button>
        </div>
      </section>

      {/* Appearance */}
      <section className="card p-6 space-y-6">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          Appearance
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Theme</label>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1">System</button>
              <button className="btn-primary flex-1">Dark</button>
              <button className="btn-secondary flex-1">Light</button>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                defaultChecked
              />
              <span className="text-sm text-text">Reduce motion</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">High contrast mode</span>
            </label>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="card p-6 space-y-4">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          About
        </h2>
        <div className="space-y-2 text-sm text-text-muted">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="font-mono">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span>Build</span>
            <span className="font-mono">development</span>
          </div>
          <div className="flex justify-between">
            <span>Framework</span>
            <span>React 19 + Vite 6</span>
          </div>
          <div className="flex justify-between">
            <span>Deployment</span>
            <span>Cloudflare Pages + Workers</span>
          </div>
        </div>
        <div className="pt-4 border-t border-border flex gap-4">
          <a
            href="https://github.com/isrockfeel/moonwitness"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:text-primary-hover"
          >
            Source Code
          </a>
          <a
            href="https://github.com/isrockfeel/moonwitness/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:text-primary-hover"
          >
            Report Issue
          </a>
          <a
            href="https://discord.gg/moonwitness"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:text-primary-hover"
          >
            Discord
          </a>
        </div>
      </section>
    </div>
  );
}
