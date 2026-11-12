-- Moonwitness Radio Database Schema
-- Run with: wrangler d1 execute moonwitness-radio --file=./schema.sql

-- Stations table
CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  stream_url TEXT NOT NULL,
  stream_type TEXT NOT NULL CHECK (stream_type IN ('hls', 'dash')),
  metadata_url TEXT,
  genre TEXT NOT NULL, -- JSON array
  language TEXT NOT NULL DEFAULT 'en',
  country TEXT NOT NULL DEFAULT 'us',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  social_links TEXT, -- JSON object
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for stations
CREATE INDEX IF NOT EXISTS idx_stations_slug ON stations(slug);
CREATE INDEX IF NOT EXISTS idx_stations_active ON stations(is_active);
CREATE INDEX IF NOT EXISTS idx_stations_genre ON stations(genre);
CREATE INDEX IF NOT EXISTS idx_stations_country ON stations(country);
CREATE INDEX IF NOT EXISTS idx_stations_sort ON stations(sort_order);

-- Tracks/Now Playing history
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  artwork_url TEXT,
  start_time INTEGER NOT NULL,
  duration INTEGER,
  is_live INTEGER NOT NULL DEFAULT 0,
  external_urls TEXT, -- JSON object
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tracks_station ON tracks(station_id);
CREATE INDEX IF NOT EXISTS idx_tracks_start_time ON tracks(start_time);

-- Listener counts history
CREATE TABLE IF NOT EXISTS listener_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  count INTEGER NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_listener_counts_station ON listener_counts(station_id);
CREATE INDEX IF NOT EXISTS idx_listener_counts_timestamp ON listener_counts(timestamp);

-- Schedule table
CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  artwork_url TEXT,
  start_time INTEGER NOT NULL,
  duration INTEGER,
  is_live INTEGER NOT NULL DEFAULT 0,
  external_urls TEXT, -- JSON object
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_schedule_station ON schedule(station_id);
CREATE INDEX IF NOT EXISTS idx_schedule_start_time ON schedule(start_time);

-- User favorites (if auth is added later)
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id TEXT NOT NULL,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (user_id, station_id)
);

-- Trigger to update updated_at on stations
CREATE TRIGGER IF NOT EXISTS update_stations_updated_at
AFTER UPDATE ON stations
BEGIN
  UPDATE stations SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

-- Insert sample stations
INSERT OR IGNORE INTO stations (id, slug, name, description, logo_url, banner_url, stream_url, stream_type, metadata_url, genre, language, country, is_active, sort_order, social_links) VALUES
('1', 'chill-hop', 'Chill Hop Radio', 'Lo-fi beats to study/relax to', 'https://picsum.photos/seed/chillhop/200/200', 'https://picsum.photos/seed/chillhop-banner/800/400', 'https://stream.example.com/chillhop.m3u8', 'hls', 'https://api.example.com/chillhop/now-playing', '["lo-fi", "chill", "hip-hop", "instrumental"]', 'en', 'us', 1, 1, '{"twitter": "@chillhop", "discord": "chillhop"}'),
('2', 'synthwave', 'Synthwave Dreams', 'Retro futuristic synthwave and retrowave', 'https://picsum.photos/seed/synthwave/200/200', 'https://picsum.photos/seed/synthwave-banner/800/400', 'https://stream.example.com/synthwave.m3u8', 'hls', 'https://api.example.com/synthwave/now-playing', '["synthwave", "retrowave", "electronic", "80s"]', 'en', 'us', 1, 2, '{"twitter": "@synthwave"}'),
('3', 'jazz-cafe', 'Jazz Cafe', 'Smooth jazz and bossa nova', 'https://picsum.photos/seed/jazz/200/200', 'https://picsum.photos/seed/jazz-banner/800/400', 'https://stream.example.com/jazz.m3u8', 'hls', NULL, '["jazz", "bossa-nova", "smooth-jazz", "instrumental"]', 'en', 'br', 1, 3, NULL),
('4', 'classical-focus', 'Classical Focus', 'Classical music for concentration', 'https://picsum.photos/seed/classical/200/200', 'https://picsum.photos/seed/classical-banner/800/400', 'https://stream.example.com/classical.m3u8', 'hls', NULL, '["classical", "ambient", "focus", "instrumental"]', 'en', 'de', 1, 4, NULL),
('5', 'indie-folk', 'Indie Folk Radio', 'Acoustic indie and folk music', 'https://picsum.photos/seed/indie/200/200', 'https://picsum.photos/seed/indie-banner/800/400', 'https://stream.example.com/indie.m3u8', 'hls', NULL, '["indie", "folk", "acoustic", "singer-songwriter"]', 'en', 'uk', 1, 5, NULL);