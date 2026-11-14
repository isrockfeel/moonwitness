# Arsy — Control Plane Host (Go)

Arsy adalah control plane host untuk VPS: observe (metrik/resource), operate (ops terbatas), dan reconcile (declarative `state.json` → `plan`/`apply`) untuk resource host seperti systemd, docker, file/dir, cron, user, firewall, network, mount, ssh, cert, gitdeploy, docker compose, package, backup, alert, webhook, dan kubernetes.

- **Binary:** `arsy` (Go stdlib, `CGO_ENABLED=0`)
- **API:** HTTP di `127.0.0.1:8787` (default), akses via SSH tunnel / reverse proxy lokal
- **Prinsip:** dua fase untuk perubahan (`plan` → hash → `apply --confirm <hash>`), allowlist/denylist safety guard, audit JSONL

## Quick start

```bash
# inisialisasi state contoh
arsy init

# cek host & kapabilitas
arsy doctor
arsy host
arsy metrics --json
arsy capabilities --json

# reconcile
arsy plan --state /etc/arsy/state.json
arsy apply --confirm <hash> --state /etc/arsy/state.json

# observe resources
arsy resources --json
arsy logs systemd caddy -n 200

# alert evaluation (berdasarkan state + metrik host)
arsy alerts check --json

# jalankan API server
arsy serve --listen 127.0.0.1:8787
```

## Konfigurasi

Default (Linux): `/etc/arsy/state.json`, `/var/log/arsy/audit.jsonl`, `/etc/arsy/data`.
Override via env: `ARSY_LISTEN`, `ARSY_STATE_PATH`, `ARSY_AUDIT_PATH`, `ARSY_DATA_DIR`, `ARSY_TOKEN_*_FILE`, `ARSY_DNS_*`.
`ARSY_ALLOW_PUBLIC=1` diperlukan jika bind non-loopback (tidak disarankan).

## State format (ringkas)

```json
{
  "version": 1,
  "resources": [
    { "kind": "systemd", "name": "caddy", "state": "started", "enabled": true },
    {
      "kind": "docker",
      "name": "web",
      "state": "running",
      "image": "nginx:latest",
      "ports": ["80:80"],
      "restart": "unless-stopped"
    },
    {
      "kind": "gitdeploy",
      "name": "app",
      "repo": "https://...",
      "branch": "main",
      "work_dir": "/opt/app",
      "post_cmd": "sh deploy.sh"
    },
    {
      "kind": "dockercompose",
      "name": "stack",
      "compose_file": "/opt/app/docker-compose.yml",
      "project_name": "app",
      "state": "up"
    },
    { "kind": "package", "name": "curl", "state": "present" },
    {
      "kind": "backup",
      "name": "app-data",
      "source": "/var/lib/app",
      "dest": "/var/backups/app.tar.gz",
      "schedule": "0 2 * * *"
    },
    { "kind": "alert", "name": "high-cpu", "metric": "cpu_pct", "op": "gt", "value": "85" },
    { "kind": "webhook", "name": "notify", "url": "https://example/hook", "event": "alert" }
  ]
}
```

Kind yang didukung (bergantung kapabilitas host): `user, dir, file, cron, firewall, portforward, network, mount, ssh, cert, gitdeploy, docker, dockercompose, systemd, alert, webhook, package, backup, kubernetes`.

## API (ringkas)

- `GET /v1/health`, `/v1/host`, `/v1/metrics`, `/v1/capabilities`, `/v1/state`, `/v1/resources?kind=`, `/v1/logs`, `/v1/audit`
- `POST /v1/plan`, `POST /v1/apply` (admin, butuh `confirm` hash)
- `POST /v1/ops/plan`, `POST /v1/ops` (admin)
- VPN/DNS/portforward/users endpoints sesuai modul internal

## Catatan

- Perubahan destruktif memerlukan allowlist dan konfirmasi plan hash.
- Audit menulis JSONL; nilai sensitif (token/password/secret) direduksi.
- Beberapa operasi bergantung tool host (`systemctl`, `docker`, `kubectl`, `certbot`, `nft/ufw`, dsb.) dan hak akses (root). Lihat `arsy doctor`.
- Firewall rule identity mencakup `from` (plan hash/ID bisa berubah dibanding state lama).

## Build & test

```bash
cd cp/arsy
go build ./...
go test ./...
```
