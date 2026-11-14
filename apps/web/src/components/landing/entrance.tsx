export function Entrance() {
  return (
    <svg
      data-entrance-stamp
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="ink-stamp pointer-events-none absolute right-4 top-20 z-30 h-20 w-20 text-[var(--pink)] sm:right-10 sm:h-28 sm:w-28"
    >
      <path
        fill="currentColor"
        d="M58 6c9 7 6 20 17 21 12 1 20-12 30-4 8 7-3 19 3 28 6 10 21 9 21 21 0 11-15 10-20 19-5 8 4 20-6 25-10 6-17-7-28-5-11 1-15 16-27 12-10-4-4-17-11-25-7-7-21-6-23-17-2-12 12-13 15-23 3-9-7-19 1-27 9-8 18 3 27-1C66 26 49 0 58 6Z"
        opacity="0.9"
      />
      <circle cx="18" cy="104" r="5" fill="currentColor" />
      <circle cx="108" cy="14" r="3.5" fill="currentColor" />
    </svg>
  );
}
