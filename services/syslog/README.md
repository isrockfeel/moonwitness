# Syslog Service

Syslog collector/ingest service for Moonwitness. Listens for syslog messages over UDP and TCP, parses RFC 3164 (BSD) and RFC 5424-style messages (best-effort), stores them in SQLite, and exposes an HTTP API for querying.

## Run

```sh
cp .env.example .env
cargo run
```

Defaults: HTTP on `127.0.0.1:8093`, UDP ingest on `5140`, TCP ingest on `5514` (unprivileged ports; use 514 with appropriate privileges/capabilities if needed).

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Bind host for HTTP and syslog listeners |
| `HTTP_PORT` | `8093` | HTTP API port |
| `SYSLOG_UDP_PORT` | `5140` | UDP syslog ingest port |
| `SYSLOG_TCP_PORT` | `5514` | TCP syslog ingest port (line-delimited) |
| `DATABASE_URL` | `sqlite:./syslog.db?mode=rwc` | SQLite database path/URL |
| `SYSLOG_MAX_MESSAGES` | `100000` | Max messages retained (oldest pruned on ingest). `0` disables pruning |

## HTTP API

- `GET /health` — service health
- `GET /api/messages?limit=&severity=&hostname=&app_name=&q=` — list messages (newest first, `limit` default 100, max 1000)
- `GET /api/messages/:id` — fetch a single message
- `GET /api/stats` — totals, counts by severity, recent source IPs

## Notes

- Parsing is best-effort: unknown formats are stored with `raw`/`message` populated and parsed fields left null.
- `apps/api` proxies this service at `/api/v1/syslog/*` when `SYSLOG_URL` is configured.