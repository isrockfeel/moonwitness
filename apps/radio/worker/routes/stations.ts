import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Station, Track, ListenerCount, PaginatedResponse } from '../../src/types/radio';

const stationsRouter = new Hono<{ Bindings: { DB: D1Database; CACHE: KVNamespace } }>();

// Validation schemas
const stationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  genre: z.string().optional(),
  search: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
});

const stationIdSchema = z.object({
  id: z.string().uuid(),
});

// Mock data for development
const mockStations: Station[] = [
  {
    id: '1',
    slug: 'chill-hop',
    name: 'Chill Hop Radio',
    description: 'Lo-fi beats to study/relax to',
    logoUrl: 'https://picsum.photos/seed/chillhop/200/200',
    bannerUrl: 'https://picsum.photos/seed/chillhop-banner/800/400',
    streamUrl: 'https://stream.example.com/chillhop.m3u8',
    streamType: 'hls',
    metadataUrl: 'https://api.example.com/chillhop/now-playing',
    genre: ['lo-fi', 'chill', 'hip-hop', 'instrumental'],
    language: 'en',
    country: 'us',
    isActive: true,
    sortOrder: 1,
    socialLinks: { twitter: '@chillhop', discord: 'chillhop' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '2',
    slug: 'synthwave',
    name: 'Synthwave Dreams',
    description: 'Retro futuristic synthwave and retrowave',
    logoUrl: 'https://picsum.photos/seed/synthwave/200/200',
    bannerUrl: 'https://picsum.photos/seed/synthwave-banner/800/400',
    streamUrl: 'https://stream.example.com/synthwave.m3u8',
    streamType: 'hls',
    metadataUrl: 'https://api.example.com/synthwave/now-playing',
    genre: ['synthwave', 'retrowave', 'electronic', '80s'],
    language: 'en',
    country: 'us',
    isActive: true,
    sortOrder: 2,
    socialLinks: { twitter: '@synthwave' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '3',
    slug: 'jazz-cafe',
    name: 'Jazz Cafe',
    description: 'Smooth jazz and bossa nova',
    logoUrl: 'https://picsum.photos/seed/jazz/200/200',
    bannerUrl: 'https://picsum.photos/seed/jazz-banner/800/400',
    streamUrl: 'https://stream.example.com/jazz.m3u8',
    streamType: 'hls',
    genre: ['jazz', 'bossa-nova', 'smooth-jazz', 'instrumental'],
    language: 'en',
    country: 'br',
    isActive: true,
    sortOrder: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '4',
    slug: 'classical-focus',
    name: 'Classical Focus',
    description: 'Classical music for concentration',
    logoUrl: 'https://picsum.photos/seed/classical/200/200',
    bannerUrl: 'https://picsum.photos/seed/classical-banner/800/400',
    streamUrl: 'https://stream.example.com/classical.m3u8',
    streamType: 'hls',
    genre: ['classical', 'ambient', 'focus', 'instrumental'],
    language: 'en',
    country: 'de',
    isActive: true,
    sortOrder: 4,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '5',
    slug: 'indie-folk',
    name: 'Indie Folk Radio',
    description: 'Acoustic indie and folk music',
    logoUrl: 'https://picsum.photos/seed/indie/200/200',
    bannerUrl: 'https://picsum.photos/seed/indie-banner/800/400',
    streamUrl: 'https://stream.example.com/indie.m3u8',
    streamType: 'hls',
    genre: ['indie', 'folk', 'acoustic', 'singer-songwriter'],
    language: 'en',
    country: 'uk',
    isActive: true,
    sortOrder: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// GET /api/stations - List stations with pagination and filters
stationsRouter.get('/stations', zValidator('query', stationQuerySchema), async (c) => {
  const { page, pageSize, genre, search, country, language } = c.req.valid('query');

  // In production, query D1 database
  // const stmt = c.env.DB.prepare('SELECT * FROM stations WHERE is_active = 1 ...');
  // const result = await stmt.all();

  let filtered = mockStations.filter((s) => s.isActive);

  if (genre) {
    filtered = filtered.filter((s) => s.genre.includes(genre));
  }
  if (country) {
    filtered = filtered.filter((s) => s.country === country);
  }
  if (language) {
    filtered = filtered.filter((s) => s.language === language);
  }
  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter(
      (s) => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
    );
  }

  filtered.sort((a, b) => a.sortOrder - b.sortOrder);

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = filtered.slice(start, end);

  const response: PaginatedResponse<Station> = {
    items,
    total: filtered.length,
    page,
    pageSize,
    hasMore: end < filtered.length,
  };

  return c.json(response);
});

// GET /api/stations/:id - Get single station
stationsRouter.get('/stations/:id', zValidator('param', stationIdSchema), async (c) => {
  const { id } = c.req.valid('param');
  const station = mockStations.find((s) => s.id === id);

  if (!station) {
    return c.json({ error: 'Station not found' }, 404);
  }

  return c.json(station);
});

// GET /api/stations/:id/now-playing - Get current track
stationsRouter.get('/stations/:id/now-playing', zValidator('param', stationIdSchema), async (c) => {
  const { id } = c.req.valid('param');
  const station = mockStations.find((s) => s.id === id);

  if (!station) {
    return c.json({ error: 'Station not found' }, 404);
  }

  // In production, fetch from metadataUrl or internal scheduler
  const mockTrack: Track = {
    id: `track-${Date.now()}`,
    stationId: id,
    title: 'Midnight Dreams',
    artist: 'Chill Producer',
    album: 'Late Night Vibes',
    artworkUrl: 'https://picsum.photos/seed/track/300/300',
    startTime: Date.now() - 120000,
    duration: 240000,
    isLive: true,
    externalUrls: {
      spotify: 'https://open.spotify.com/track/...',
      appleMusic: 'https://music.apple.com/track/...',
    },
  };

  return c.json(mockTrack);
});

// GET /api/stations/:id/listeners - Get listener count
stationsRouter.get('/stations/:id/listeners', zValidator('param', stationIdSchema), async (c) => {
  const { id } = c.req.valid('param');

  // In production, get from Durable Object or KV
  const count = Math.floor(Math.random() * 5000) + 100;

  const response: ListenerCount = {
    stationId: id,
    count,
    timestamp: Date.now(),
  };

  return c.json(response);
});

// GET /api/stations/:id/schedule - Get upcoming schedule
stationsRouter.get('/stations/:id/schedule', zValidator('param', stationIdSchema), async (c) => {
  const { id } = c.req.valid('param');
  const date = c.req.query('date');

  // In production, query schedule from database
  const mockSchedule: Track[] = Array.from({ length: 20 }, (_, i) => ({
    id: `track-${id}-${i}`,
    stationId: id,
    title: `Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
    artworkUrl: `https://picsum.photos/seed/track${i}/300/300`,
    startTime: Date.now() + i * 1800000,
    duration: 180000,
    isLive: false,
  }));

  return c.json(mockSchedule);
});

// GET /api/genres - Get all genres
stationsRouter.get('/genres', async (c) => {
  const genres = [...new Set(mockStations.flatMap((s) => s.genre))].sort();
  return c.json(genres);
});

// GET /api/countries - Get all countries
stationsRouter.get('/countries', async (c) => {
  const countries = [...new Set(mockStations.map((s) => s.country))].sort();
  return c.json(countries);
});

// GET /api/languages - Get all languages
stationsRouter.get('/languages', async (c) => {
  const languages = [...new Set(mockStations.map((s) => s.language))].sort();
  return c.json(languages);
});

export { stationsRouter };