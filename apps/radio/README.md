# Moonwitness Radio

A modern, edge-native radio streaming application built with React 19, Vite 6, and deployed on Cloudflare Pages + Workers.

## Features

- 🎵 **HLS Audio Streaming** - High-quality adaptive streaming via hls.js
- 📱 **PWA Support** - Installable, works offline with service workers
- 🔴 **Real-time Now Playing** - WebSocket-powered live track updates via Cloudflare Durable Objects
- 👥 **Listener Counts** - Real-time listener statistics
- 🎨 **Modern UI** - Tailwind CSS v4 with @moonwitness/ui design system
- ⚡ **Edge Deployment** - Global <50ms latency on Cloudflare's network
- 🎮 **Media Session API** - Lock screen controls, background playback
- 🔍 **Station Discovery** - Search, filter by genre/country, favorites

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite 6 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| State | Zustand + TanStack Query |
| Audio | hls.js + Media Session API |
| Real-time | Cloudflare Workers + Durable Objects |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Deployment | Cloudflare Pages + Workers |

## Project Structure

```
apps/radio/
├── public/                 # Static assets
│   ├── _headers           # Cloudflare Pages headers
│   ├── _redirects         # SPA routing
│   └── icons/             # PWA icons
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   ├── PlayerBar.tsx # Persistent audio player
│   │   ├── StationCard.tsx
│   │   ├── StationList.tsx
│   │   ├── StationDetail.tsx
│   │   ├── LivePage.tsx
│   │   ├── StationDrawer.tsx
│   │   └── SettingsPage.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── use-stations.ts
│   │   └── use-websocket.ts
│   ├── services/         # Business logic
│   │   ├── api.ts        # API client
│   │   └── audio-engine.ts # HLS audio engine
│   ├── stores/           # Zustand stores
│   │   └── radio-store.ts
│   ├── types/            # TypeScript types
│   │   └── radio.ts
│   ├── lib/              # Utilities
│   │   ├── query-client.ts
│   │   └── utils.ts
│   ├── styles/           # Global styles
│   │   └── globals.css
│   ├── App.tsx           # Root component
│   └── main.tsx          # Entry point
├── worker/               # Cloudflare Worker
│   ├── index.ts          # Worker entry (Hono)
│   ├── routes/
│   │   ├── stations.ts   # Station API routes
│   │   └── websocket.ts  # WebSocket upgrade
│   ├── durable-objects/
│   │   └── radio-room.ts # WebSocket room state
│   └── schema.sql        # D1 database schema
├── tests/                # Vitest tests
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.toml
├── vitest.config.ts
└── eslint.config.mjs
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 12+
- Cloudflare account (for deployment)

### Installation

```bash
# From monorepo root
pnpm install

# Start development server
pnpm radio:dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create `.env` in `apps/radio/`:

```env
# Public (Vite)
VITE_API_BASE_URL=http://localhost:8787/api
VITE_WS_URL=ws://localhost:8787/ws

# Private (Worker - set in Cloudflare dashboard)
# CLOUDFLARE_API_TOKEN
# CLOUDFLARE_ACCOUNT_ID
```

### Development with Worker

```bash
# Terminal 1: Start Vite dev server
pnpm radio:dev

# Terminal 2: Start Worker dev server
cd apps/radio
npx wrangler dev
```

## Cloudflare Setup

### 1. Create D1 Database

```bash
npx wrangler d1 create moonwitness-radio
# Note the database_id from output
```

### 2. Create KV Namespace

```bash
npx wrangler kv:namespace create CACHE
# Note the id from output
```

### 3. Update wrangler.toml

```toml
[[d1_databases]]
binding = "DB"
database_name = "moonwitness-radio"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"
```

### 4. Run Migrations

```bash
npx wrangler d1 execute moonwitness-radio --file=./worker/schema.sql
```

### 5. Deploy

```bash
# Build and deploy Pages
pnpm radio:build
npx wrangler pages deploy dist --project-name=moonwitness-radio

# Deploy Worker
npx wrangler deploy
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations` | List stations (paginated, filterable) |
| GET | `/api/stations/:id` | Get station details |
| GET | `/api/stations/:id/now-playing` | Get current track |
| GET | `/api/stations/:id/listeners` | Get listener count |
| GET | `/api/stations/:id/schedule` | Get upcoming schedule |
| GET | `/api/genres` | List all genres |
| GET | `/api/countries` | List all countries |
| GET | `/api/languages` | List all languages |
| WS | `/ws/station/:stationId` | WebSocket for real-time updates |

## WebSocket Messages

### Client → Server

```json
{ "type": "join", "stationId": "uuid" }
{ "type": "ping" }
```

### Server → Client

```json
{ "type": "now-playing", "stationId": "uuid", "track": {...}, "timestamp": 1234567890 }
{ "type": "listener-count", "stationId": "uuid", "count": 42, "timestamp": 1234567890 }
{ "type": "pong", "timestamp": 1234567890 }
{ "type": "error", "error": "message", "timestamp": 1234567890 }
```

## Scripts

```bash
pnpm radio:dev      # Start Vite dev server
pnpm radio:build    # Build for production
pnpm radio:deploy   # Deploy to Cloudflare Pages
pnpm radio:test     # Run tests
pnpm lint           # Lint code
pnpm typecheck      # Type check
```

## Testing

```bash
# Unit tests
pnpm radio:test

# With UI
pnpm radio:test:ui

# Coverage
pnpm radio:test --coverage
```

## PWA Features

- **Offline Support** - Caches station data, HLS manifests, and segments
- **Install Prompt** - Add to home screen on mobile/desktop
- **Background Sync** - Queue actions when offline
- **Media Session** - Lock screen controls, hardware keys

## Performance

- **Code Splitting** - Vendor, audio, and query chunks
- **Lazy Loading** - Components loaded on demand
- **Edge Caching** - Static assets cached globally
- **Streaming** - HLS adaptive bitrate streaming

## Accessibility

- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader support
- Reduced motion support

## License

MIT - See LICENSE file for details.