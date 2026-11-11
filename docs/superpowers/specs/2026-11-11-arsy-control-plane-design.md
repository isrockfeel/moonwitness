# Arsy — Control Plane VPS (Go)

> **Status:** desain disetujui arahnya (2026-11-11). Bukan LLM gateway.
> **Lokasi:** `cp/arsy` (modul Go mandiri, di luar workspace pnpm), `install.sh` di root repo.

## 1. Tujuan

Satu binary Go `arsy` yang dipasang di VPS Linux sebagai service, berfungsi sebagai control plane host:

1. **Observe** — metrik host (CPU, RAM, disk, load, uptime), daftar unit systemd, container Docker, port yang listen, log.
2. **Operate** — start/stop/restart unit & container, baca log, jalankan aksi terbatas. Semua aksi tercatat.
3. **Reconcile** — deklarasi state (`/etc/arsy/state.json`) lalu `arsy plan` (diff) dan `arsy apply` (converge) untuk systemd, Docker, file/direktori, cron, user, firewall.
4. **Serve** — API HTTP di `127.0.0.1:8787` untuk CLI dan dashboard.

Prinsip:

- **Stdlib only.** Tanpa dependency eksternal, `CGO_ENABLED=0`, cross-compile Linux/Windows/Darwin.
- **Localhost only.** Tidak ada port publik; akses lewat SSH tunnel atau dari `apps/api` di host yang sama.
- **Dua tingkat akses.** Token admin (baca+tulis) dan token read-only. File 0600.
- **Dua fase untuk semua perubahan.** `plan` menghasilkan hash; `apply` wajib menyertakan hash itu. Tidak ada perubahan destruktif tanpa pratinjau.
- **Allowlist + denylist.** Unit, container, path, user, dan cron dibatasi konfigurasi. Default menolak path sistem sensitif.
- **Audit.** Setiap request tulis dan setiap penolakan ditulis ke `audit.jsonl`.

## 2. Bentuk yang ditolak

- LLM/API gateway, routing model, kuota token — di luar scope.
- Multi-VPS hub/agent — disiapkan lewat interface `Host`, tidak diimplementasikan v1.
- Container sebagai tempat arsy berjalan — butuh privileged + mount systemd; arsy adalah service host.

## 3. Arsitektur

```
cp/arsy/
  cmd/arsy/main.go            CLI: serve|status|plan|apply|ops|logs|doctor|version
  internal/config             config JSON + default + validasi
  internal/host               deteksi OS/WSL/capability, exec runner
  internal/metrics            metrik per-OS (build tag)
  internal/resources          provider per resource
  internal/reconcile          planner, diff, hash, applier
  internal/safety             allowlist/denylist
  internal/audit              JSONL audit
  internal/api                HTTP API + auth middleware
install.sh                    root repo: arsy + app Node + opsional Caddy
```

Alur:

```
CLI / dashboard
      │  (dashboard: web → apps/api → arsy)
      ▼
  arsy API (127.0.0.1:8787)
      │  auth + audit + guard
      ▼
  planner ──► resource provider ──► systemctl / docker / fs / crontab / useradd / ufw|nft
```

### 3.1 Deteksi OS

| Kemampuan      | Linux                           | WSL                      | Windows                          |
| -------------- | ------------------------------- | ------------------------ | -------------------------------- |
| metrik host    | /proc, statfs                   | /proc (subset)           | runtime-only, ditandai `limited` |
| file/direktori | ya                              | ya                       | ya                               |
| systemd        | ya (jika `/run/systemd/system`) | ya (jika systemd aktif)  | tidak didukung                   |
| docker         | ya (CLI)                        | ya (jika Docker Desktop) | ya (CLI)                         |
| cron           | crontab                         | crontab                  | tidak didukung                   |
| user/group     | useradd/getent                  | sama                     | tidak didukung                   |
| firewall       | ufw/nft                         | sama                     | tidak didukung                   |

`arsy doctor` melaporkan matriks ini. Provider yang tidak didukung mengembalikan `ErrUnsupported` — bukan panic, bukan diam-diam sukses.

## 4. Model resource

`state.json`:

```json
{
  "version": 1,
  "resources": [
    { "kind": "systemd", "name": "caddy", "state": "started", "enabled": true },
    {
      "kind": "docker",
      "name": "moonwitness-web",
      "state": "running",
      "image": "ghcr.io/isrockfeel/moonwitness-web:latest",
      "ports": ["127.0.0.1:3000:3000"],
      "restart": "unless-stopped"
    },
    {
      "kind": "file",
      "path": "/etc/caddy/Caddyfile",
      "content": "...",
      "mode": "0644",
      "owner": "root:root"
    },
    { "kind": "dir", "path": "/opt/moonwitness", "mode": "0755" },
    {
      "kind": "cron",
      "name": "arsy-audit-rotate",
      "owner": "root",
      "schedule": "0 3 * * *",
      "command": "logrotate /etc/logrotate.d/arsy"
    },
    {
      "kind": "user",
      "name": "deploy",
      "shell": "/bin/bash",
      "groups": ["docker"],
      "system": true
    },
    { "kind": "firewall", "action": "allow", "port": "80", "proto": "tcp", "from": "any" }
  ]
}
```

Aturan:

- Resource tanpa `kind` valid → state ditolak sebelum plan.
- Identitas resource: `kind` + `name` (atau `path`/`port`).
- Resource di luar allowlist → plan gagal, bukan apply sebagian.
- Reconcile tidak pernah menghapus resource yang tidak dideklarasikan. Penghapusan hanya lewat `state: "absent"`.

## 5. Reconcile

1. `Probe` provider → observasi aktual.
2. Bandingkan dengan spec → `create` / `update` / `none` + ringkasan diff.
3. `plan` = daftar entri + `sha256` kanonik.
4. `apply --confirm <hash>` hanya jalan jika hash cocok dengan plan yang dihitung ulang.
5. Urutan apply: `user` → `dir` → `file` → `cron` → `firewall` → `docker` → `systemd`.
6. Gagal di satu resource menghentikan sisanya, dan hasil parsial dilaporkan jujur per entri.

Ops imperatif (`restart`, `stop`, `rm`) memakai pola dua fase yang sama: `POST /v1/ops/plan` → `POST /v1/ops?confirm=`.

## 6. Keamanan

- Token: `/etc/arsy/token-admin`, `/etc/arsy/token-readonly`, mode 0600, dibuat installer jika belum ada.
- Middleware: `Authorization: Bearer <token>`; perbandingan constant-time.
- Role read-only menolak semua non-GET.
- Default denylist: `ssh.service`, `sshd.service`, `systemd-*`, `/etc/shadow`, `/etc/sudoers`, `/boot`, `/`, `/usr`, `/lib*`, `/proc`, `/sys`.
- Path file harus berada di dalam allowlist direktori.
- Perintah dijalankan sebagai argv (tanpa shell), sehingga tidak ada injeksi.
- `apply` mencetak ringkasan sebelum eksekusi; API menolak tanpa `confirm`.
- Audit mencatat role, method, path, target, hasil, hash plan, dan pesan error.

## 7. API

| Method | Path                            | Role  | Keterangan                   |
| ------ | ------------------------------- | ----- | ---------------------------- |
| GET    | `/v1/health`                    | any   | status + versi               |
| GET    | `/v1/host`                      | any   | OS, arch, capability, uptime |
| GET    | `/v1/metrics`                   | any   | cpu, mem, disk, load         |
| GET    | `/v1/state`                     | any   | state file saat ini          |
| POST   | `/v1/plan`                      | admin | body state → plan + hash     |
| POST   | `/v1/apply`                     | admin | state + `confirm`            |
| GET    | `/v1/resources?kind=`           | any   | observasi resource           |
| POST   | `/v1/ops/plan`                  | admin | rencana ops tunggal          |
| POST   | `/v1/ops`                       | admin | ops + `confirm`              |
| GET    | `/v1/logs?source=&name=&lines=` | any   | systemd/docker log           |
| GET    | `/v1/audit?lines=`              | any   | audit terakhir               |
| GET    | `/v1/capabilities`              | any   | matriks dukungan             |

## 8. install.sh

Satu script idempoten di root repo:

```sh
sudo ./install.sh --domain vps.contoh.id --email admin@contoh.id
```

Langkah: cek OS/arsitektur → build `arsy` (Go) atau pakai `--binary` → install ke `/usr/local/bin` → buat `/etc/arsy` + token + config + state contoh → pasang `arsy.service` → `--with-app` (pnpm install/build, unit web+api, env file) → `--with-caddy` (Caddyfile di belakang domain) → `arsy doctor`.

Flag: `--dry-run`, `--uninstall`, `--with-app`, `--no-app`, `--with-caddy`, `--domain`, `--email`, `--port`, `--binary`.

Script tidak pernah menimpa config/token yang sudah ada; upgrade hanya mengganti binary dan unit bila berubah.

## 9. Dashboard

`apps/api` menambahkan route `/control/*` yang mem-proxy ke arsy memakai `ARSY_URL` + `ARSY_TOKEN` (server-side; token tidak pernah sampai browser). `apps/web` menambah halaman `/control`:

- kartu host: OS, uptime, load, RAM, disk
- tabel unit systemd + container dengan aksi start/stop/restart (dua fase: tampilkan hash lalu konfirmasi)
- panel audit terakhir

## 10. Pengujian

- Unit: planner/diff, guard allowlist, auth, config, parser metrik, apply dengan `FakeRunner`.
- Integrasi Linux (WSL): files/dir, crontab, systemd user unit, docker (jika tersedia).
- Windows: build + `doctor` + file provider.
- `go vet ./...`, `gofmt -l`, cross-build `GOOS=linux`, `GOOS=windows`.
- `sh -n install.sh` + `./install.sh --dry-run` di WSL.

## 11. Milestone

| #   | Isi                                | Selesai jika                                                   |
| --- | ---------------------------------- | -------------------------------------------------------------- |
| M1  | core + API + CLI + metrik          | `arsy serve` jalan, `status`/`doctor` benar di Windows & Linux |
| M2  | resource systemd, docker, file/dir | ops dan plan/apply jalan di WSL                                |
| M3  | cron, user, firewall               | plan/apply dengan guardrail teruji                             |
| M4  | install.sh                         | `--dry-run` bersih; install nyata di VPS kosong                |
| M5  | dashboard                          | `/control` menampilkan metrik + resource lewat apps/api        |
