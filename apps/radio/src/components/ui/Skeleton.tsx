export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-surface-elevated rounded-lg border border-border ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className="h-4 bg-surface-elevated rounded border border-border animate-pulse mb-2"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card ${className}`}>
      <Skeleton className="aspect-square w-full mb-4" />
      <SkeletonText lines={3} />
    </div>
  );
}
