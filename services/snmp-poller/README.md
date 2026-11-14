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

Base URL: `http://<HOST>:<HTTP_PORT>`

### Health

- `GET /health`
  - `200 OK` -> `{"status":"ok","service":"snmp-poller"}`

### Devices

- `GET /api/devices`
  - `200 OK` -> `Device[]` ordered by `name`

- `POST /api/devices`
  - Request body:
    ```json
    {
      "name": "router-1",
      "host": "192.168.1.1",
      "port": 161,
      "version": "2c",
      "community": "public",
      "enabled": true
    }
    ```
    - `name` (string, required, non-empty)
    - `host` (string, required, non-empty)
    - `port` (integer, optional, default `161`)
    - `version` (string, optional, default `"2c"`, allowed: `"1"` or `"2c"`)
    - `community` (string, optional, default `"public"`)
    - `enabled` (boolean, optional, default `true`)
  - `201 Created` -> `Device`
  - `400 Bad Request` if required fields missing/empty or `version` invalid

- `GET /api/devices/:id`
  - `200 OK` -> `Device`
  - `404 Not Found` if device does not exist

- `DELETE /api/devices/:id`
  - `204 No Content` on success
  - `404 Not Found` if device does not exist

### Targets

- `GET /api/devices/:id/targets`
  - `200 OK` -> `Target[]` for the device, ordered by `name`

- `POST /api/devices/:id/targets`
  - Request body:
    ```json
    {
      "name": "ifInOctets-eth0",
      "oid": ".1.3.6.1.2.1.2.2.1.10.2",
      "poll_interval": 60,
      "enabled": true
    }
    ```
    - `name` (string, required, non-empty)
    - `oid` (string, required, non-empty)
    - `poll_interval` (integer|null, optional, seconds; `null`/omitted uses service default `SNMP_POLL_INTERVAL`)
    - `enabled` (boolean, optional, default `true`)
  - `201 Created` -> `Target`
  - `400 Bad Request` if `name`/`oid` missing or empty
  - `404 Not Found` if device does not exist

- `GET /api/targets/:id`
  - `200 OK` -> `Target`
  - `404 Not Found` if target does not exist

- `DELETE /api/targets/:id`
  - `204 No Content` on success
  - `404 Not Found` if target does not exist

### Samples / Timeseries

- `GET /api/targets/:id/samples?from=&to=&limit=`
  - Query params (all optional):
    - `from` (integer, Unix seconds) - inclusive lower bound
    - `to` (integer, Unix seconds) - inclusive upper bound (used when `from` is also provided)
    - `limit` (integer, default `500`, clamped to `1..10000`)
  - Behavior (current implementation):
    - `from` + `to`: returns samples where `ts >= from AND ts <= to` ordered by `ts ASC`, limited.
    - `from` only: returns samples where `ts >= from` ordered by `ts ASC`, limited.
    - no `from`: returns latest samples ordered by `ts DESC`, limited (most recent first).
  - `200 OK` -> `Sample[]`

- `GET /api/targets/:id/latest`
  - `200 OK` -> latest `Sample`
  - `404 Not Found` if no samples exist for the target

### Stats

- `GET /api/stats`
  - `200 OK` -> `Stats`

## Data Models

### Device (response)
```json
{
  "id": "uuid",
  "name": "router-1",
  "host": "192.168.1.1",
  "port": 161,
  "version": "2c",
  "community": "public",
  "enabled": true,
  "created_at": 1730000000
}
```
- `created_at`: Unix timestamp (seconds)

### Target (response)
```json
{
  "id": "uuid",
  "device_id": "uuid",
  "name": "ifInOctets-eth0",
  "oid": ".1.3.6.1.2.1.2.2.1.10.2",
  "poll_interval": 60,
  "enabled": true,
  "created_at": 1730000000
}
```
- `poll_interval`: seconds or `null` (uses service default)

### Sample (response)
```json
{
  "id": "uuid",
  "target_id": "uuid",
  "ts": 1730000060,
  "counter": 123456789,
  "rate": 1024.5
}
```
- `ts`: Unix timestamp (seconds)
- `counter`: raw counter value
- `rate`: units/sec or `null` (e.g. first sample / unavailable)

### Stats (response)
```json
{
  "total_devices": 2,
  "enabled_devices": 2,
  "total_targets": 5,
  "total_samples": 12000
}
```

## Notes

- Supports SNMP v1/v2c (community). v3 auth/priv is not implemented yet.
- Counter values are read as Counter32/Counter64/Unsigned/Integer; rate uses unsigned 64-bit wrapping subtraction (handles 32- and 64-bit counter wraps).
- `apps/api` proxies this service at `/api/v1/snmp/*` when `SNMP_POLLER_URL` is configured.
- This is a data-plane polling daemon; device inventory/management UI and on-demand ops belong in the control plane (`cp/`).
