import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Station, PaginatedResponse } from '../types/radio';

export function useStations(params?: { page?: number; pageSize?: number; genre?: string; search?: string }) {
  return useQuery({
    queryKey: ['stations', params],
    queryFn: () => api.getStations(params),
    staleTime: 60_000,
  });
}

export function useInfiniteStations(params?: { genre?: string; search?: string; pageSize?: number }) {
  return useInfiniteQuery({
    queryKey: ['stations', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => api.getStations({ ...params, page: pageParam, pageSize: params?.pageSize || 20 }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 60_000,
  });
}

export function useStation(id: string) {
  return useQuery({
    queryKey: ['station', id],
    queryFn: () => api.getStation(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useNowPlaying(stationId: string) {
  return useQuery({
    queryKey: ['now-playing', stationId],
    queryFn: () => api.getNowPlaying(stationId),
    enabled: !!stationId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useListenerCount(stationId: string) {
  return useQuery({
    queryKey: ['listeners', stationId],
    queryFn: () => api.getListenerCount(stationId),
    enabled: !!stationId,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useSchedule(stationId: string, date?: string) {
  return useQuery({
    queryKey: ['schedule', stationId, date],
    queryFn: () => api.getSchedule(stationId, date),
    enabled: !!stationId,
    staleTime: 5 * 60_000,
  });
}

export function useSearchStations(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.searchStations(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: () => api.getGenres(),
    staleTime: 24 * 60 * 60_000,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: () => api.getCountries(),
    staleTime: 24 * 60 * 60_000,
  });
}