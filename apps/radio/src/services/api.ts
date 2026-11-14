import type { Station, Track, ListenerCount, PaginatedResponse } from "../types/radio";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const WS_URL = import.meta.env.VITE_WS_URL || "wss://api.moonwitness.dev";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getStations(params?: {
    page?: number;
    pageSize?: number;
    genre?: string;
    search?: string;
  }): Promise<PaginatedResponse<Station>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString());
    if (params?.genre) searchParams.set("genre", params.genre);
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Station>>(`/stations${query ? `?${query}` : ""}`);
  }

  async getStation(id: string): Promise<Station> {
    return this.request<Station>(`/stations/${id}`);
  }

  async getNowPlaying(stationId: string): Promise<Track | null> {
    try {
      return await this.request<Track>(`/stations/${stationId}/now-playing`);
    } catch {
      return null;
    }
  }

  async getListenerCount(stationId: string): Promise<ListenerCount> {
    return this.request<ListenerCount>(`/stations/${stationId}/listeners`);
  }

  async getSchedule(stationId: string, date?: string): Promise<Track[]> {
    const params = date ? `?date=${date}` : "";
    return this.request<Track[]>(`/stations/${stationId}/schedule${params}`);
  }

  async searchStations(query: string): Promise<Station[]> {
    return this.request<Station[]>(`/stations/search?q=${encodeURIComponent(query)}`);
  }

  async getGenres(): Promise<string[]> {
    return this.request<string[]>("/genres");
  }

  async getCountries(): Promise<string[]> {
    return this.request<string[]>("/countries");
  }
}

export const api = new ApiClient();

export function createWebSocketUrl(stationId: string): string {
  return `${WS_URL}/ws/station/${stationId}`;
}

export function createStationShareUrl(station: Station): string {
  return window.location.origin + `/station/${station.slug}`;
}
