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

Base URL: `http://<HOST>:<HTTP_PORT>`

### Health

- `GET /health`
  - `200 OK` -> `{"status":"ok","service":"syslog"}`

### Messages

- `GET /api/messages?limit=&severity=&hostname=&app_name=&q=`
  - Query params (all optional):
    - `limit` (integer, default `100`, clamped to `1..1000`)
    - `severity` (integer) - filter by syslog severity
    - `hostname` (string) - exact hostname match
    - `app_name` (string) - exact app name match
    - `q` (string) - substring search (`LIKE %q%`) over `message` and `raw`
  - **Filter precedence (current implementation):** if multiple filters are provided, only one is applied in this order: `severity` -> `hostname` -> `app_name` -> `q`. If none provided, returns all messages.
  - `200 OK` -> `SyslogMessage[]` ordered by `received_at DESC`

- `GET /api/messages/:id`
  - `200 OK` -> `SyslogMessage`
  - `404 Not Found` if message does not exist

### Stats

- `GET /api/stats`
  - `200 OK` -> `Stats`

## Data Models

### SyslogMessage (response)
```json
{
  "id": "string",
  "received_at": 1730000000,
  "source_ip": "10.0.0.1",
  "transport": "udp",
  "facility": 1,
  "severity": 5,
  "priority": 13,
  "timestamp": "2026-11-14T03:00:00Z",
  "hostname": "router-1",
  "app_name": "sshd",
  "procid": "1234",
  "msgid": "-",
  "message": "Accepted password for user",
  "raw": "<13>..."
}
```
- `received_at`: Unix timestamp (seconds)
- Nullable fields (`source_ip`, `facility`, `severity`, `priority`, `timestamp`, `hostname`, `app_name`, `procid`, `msgid`) may be `null` when not parsed.

### Stats (response)
```json
{
  "total_messages": 1234,
  "by_severity": [
    { "severity": 5, "count": 100 }
  ],
  "recent_sources": ["10.0.0.1", "10.0.0.2"]
}
```
- `by_severity[].severity` may be `null` for unparsed severity; grouped and ordered by severity.
- `recent_sources`: up to 20 distinct non-null source IPs, ordered by most recent `received_at`.

## Notes

- Parsing is best-effort: unknown formats are stored with `raw`/`message` populated and parsed fields left null.
- `apps/api` proxies this service at `/api/v1/syslog/*` when `SYSLOG_URL` is configured.
