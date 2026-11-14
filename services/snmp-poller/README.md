# snmp-poller

SNMP poller and metrics/timeseries service (MRTG-style) for Moonwitness. Periodically polls configured SNMP OID counters from devices, computes per-second rates (with 32/64-bit wrap handling), stores samples in SQLite, and exposes an HTTP API for device/target management and series queries (for graphing in `apps/web`).

## Run

```sh
cp .env.example .env
cargo run
```

Default HTTP: `127.0.0.1:8094`.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Bind host |
| `HTTP_PORT` | `8094` | HTTP API port |
| `DATABASE_URL` | `sqlite:./snmp-poller.db?mode=rwc` | SQLite database |
| `SNMP_POLL_INTERVAL` | `60` | Default poll interval (seconds) per target |
| `SNMP_TIMEOUT_MS` | `2000` | SNMP request timeout (ms) |
| `SNMP_MAX_SAMPLES` | `50000` | Max samples retained per target (`0` = unlimited) |

## Concepts

- **Device**: an SNMP agent (`host`, `port`, `version` `1`/`2c`, `community`).
- **Target**: an OID counter on a device (e.g. `ifInOctets` `.1.3.6.1.2.1.2.2.1.10.<ifIndex>` / `ifHCInOctets` `.1.3.6.1.2.1.31.1.1.1.6.<ifIndex>`), with optional per-target poll interval.
- **Sample**: `(ts, counter, rate)` where `rate` is units/sec computed from the previous sample (unsigned wrapping delta).

## HTTP API

- `GET /health`
- `GET|POST /api/devices`, `GET|DELETE /api/devices/:id`
- `GET|POST /api/devices/:id/targets`
- `GET|DELETE /api/targets/:id`
- `GET /api/targets/:id/samples?from=&to=&limit=` — timeseries (for graphs)
- `GET /api/targets/:id/latest`
- `GET /api/stats`

`apps/api` proxies this service at `/api/v1/snmp/*` when `SNMP_POLLER_URL` is configured.

## Notes

- Supports SNMP v1/v2c (community). v3 auth/priv is not implemented yet.
- Counter values are read as Counter32/Counter64/Unsigned/Integer; rate uses unsigned 64-bit wrapping subtraction (handles 32- and 64-bit counter wraps).
- This is a data-plane polling daemon; device inventory/management UI and on-demand ops belong in the control plane (`cp/`).