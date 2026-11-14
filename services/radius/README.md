# Radius Service

RADIUS authentication and accounting service for Moonwitness. Runs UDP RADIUS servers (auth on 1812, accounting on 1813) and exposes an HTTP admin API for user management, logs, and stats. User passwords are stored as bcrypt hashes in SQLite.

## Run

```sh
cp .env.example .env
cargo run
```

Defaults: HTTP on `127.0.0.1:3000`, RADIUS auth on UDP `1812`, RADIUS accounting on UDP `1813`.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Bind host for HTTP and UDP listeners |
| `HTTP_PORT` | `3000` | HTTP admin API port |
| `RADIUS_AUTH_PORT` | `1812` | RADIUS authentication UDP port |
| `RADIUS_ACCT_PORT` | `1813` | RADIUS accounting UDP port |
| `RADIUS_SECRET` | `moonwitness-radius-secret` | Shared secret for RADIUS clients (NAS) |
| `DATABASE_URL` | `sqlite:./radius.db?mode=rwc` | SQLite database path/URL |

## HTTP API

Base URL: `http://<HOST>:<HTTP_PORT>`

### Health

- `GET /health`
  - `200 OK` → `{"status":"ok","service":"radius"}`

### Users

- `GET /api/users`
  - `200 OK` → `User[]`

- `POST /api/users`
  - Request body:
    ```json
    {
      "username": "alice",
      "password": "secret",
      "enabled": true,
      "framed_ip": "10.0.0.10",
      "vlan_id": 100,
      "session_timeout": 3600,
      "mac_address": "AA:BB:CC:DD:EE:FF"
    }
    ```
    - `username` (string, required, non-empty)
    - `password` (string, required, non-empty) — stored as bcrypt hash
    - `enabled` (boolean, optional, default `true`)
    - `framed_ip` (string|null, optional)
    - `vlan_id` (integer|null, optional)
    - `session_timeout` (integer|null, optional, seconds)
    - `mac_address` (string|null, optional)
  - `201 Created` → `User`
  - `400 Bad Request` if username/password missing
  - `409 Conflict` if username already exists

- `GET /api/users/:username`
  - `200 OK` → `User`
  - `404 Not Found` if user does not exist

- `PUT /api/users/:username`
  - Request body (all fields optional; omitted fields keep existing values except password which keeps existing hash if omitted):
    ```json
    {
      "password": "new-secret",
      "enabled": true,
      "framed_ip": "10.0.0.11",
      "vlan_id": 101,
      "session_timeout": 7200,
      "mac_address": "AA:BB:CC:DD:EE:00"
    }
    ```
  - `200 OK` → updated `User`
  - `404 Not Found` if user does not exist

- `DELETE /api/users/:username`
  - `204 No Content` on success
  - `404 Not Found` if user does not exist

### Logs

- `GET /api/logs?limit=&username=`
  - Query params:
    - `limit` (integer, optional, default `100`, clamped to `1..1000`)
    - `username` (string, optional) — filter by username
  - `200 OK` → `RadiusLog[]` (newest first)

### Stats

- `GET /api/stats`
  - `200 OK` → `Stats`

## Data Models

### User (response)
```json
{
  "id": "uuid",
  "username": "alice",
  "enabled": true,
  "framed_ip": "10.0.0.10",
  "vlan_id": 100,
  "session_timeout": 3600,
  "mac_address": "AA:BB:CC:DD:EE:FF"
}
```
> `password` (hash) is never returned in API responses.

### RadiusLog (response)
```json
{
  "id": "uuid",
  "username": "alice",
  "nas_ip": "192.168.1.1",
  "nas_port": "0",
  "event": "auth",
  "result": "accept",
  "framed_ip": "10.0.0.10",
  "vlan_id": 100,
  "created_at": 1730000000
}
```
- `created_at`: Unix timestamp (seconds)

### Stats (response)
```json
{
  "total_users": 10,
  "enabled_users": 8,
  "total_logins": 42,
  "recent_rejects": 3
}
```
- `recent_rejects`: count of logs with `result LIKE 'reject%'` in the last 24 hours

## RADIUS Protocol (UDP)

- **Authentication**: listens on `RADIUS_AUTH_PORT` (default 1812). Validates Access-Request against users in DB (bcrypt password check, enabled flag, optional MAC binding) and returns Access-Accept/Access-Reject with attributes (Framed-IP, VLAN, Session-Timeout) as configured.
- **Accounting**: listens on `RADIUS_ACCT_PORT` (default 1813). Accepts Accounting-Request and records events to `radius_logs`.
- All packets must be signed with `RADIUS_SECRET`. NAS/clients must share this secret.

## Notes

- `apps/api` proxies this service at `/api/v1/radius/*` when `RADIUS_URL` is configured.
- Passwords are bcrypt-hashed (cost default). Plaintext passwords are never stored or returned.
- This is a data-plane/auth service; higher-level provisioning, policy, and UI belong in the control plane (`cp/`).
- Use TLS termination / network isolation for the HTTP API in production. RADIUS UDP should be restricted to trusted NAS IPs at the network layer.