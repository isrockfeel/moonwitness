import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { api } from "../../services/api";
import { StationCard } from "../StationCard/StationCard";
import { Skeleton } from "../ui/Skeleton";

export function StationList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ["stations", "infinite"],
      queryFn: ({ pageParam = 1 }) => api.getStations({ page: pageParam, pageSize: 20 }),
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
    });

  const { ref, inView } = useInView();

  const stations = data?.pages.flatMap((page) => page.items) || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error">Failed to load stations</p>
        <button className="btn-primary mt-4" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stations.map((station) => (
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

      {!hasNextPage && stations.length > 0 && (
        <p className="text-center text-text-muted py-4">End of stations</p>
      )}
    </div>
  );
}
