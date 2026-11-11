#!/usr/bin/env sh
# arsy — installer control plane Moonwitness.
#
#   sudo ./install.sh --domain vps.contoh.id --email admin@contoh.id
#
# Idempoten: menjalankan ulang tidak menimpa config/token yang sudah ada.
# Lihat --help untuk daftar flag.

set -eu

VERSION="0.1.0"
BIN_PATH="/usr/local/bin/arsy"
CONF_DIR="/etc/arsy"
CONF_FILE="$CONF_DIR/config.json"
STATE_FILE="$CONF_DIR/state.json"
LOG_DIR="/var/log/arsy"
UNIT_PATH="/etc/systemd/system/arsy.service"
SERVICE_USER="root"

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

WITH_APP="ask"
WITH_CADDY="no"
DRY_RUN="no"
UNINSTALL="no"
DOMAIN=""
EMAIL=""
LISTEN="127.0.0.1:8787"
APP_DIR=""
BINARY_SRC=""

log()  { printf '  %s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
arsy installer

Pemakaian:
  sudo ./install.sh [opsi]

Opsi:
  --domain <host>     domain publik untuk app/dashboard (opsional)
  --email <email>     email untuk ACME Caddy (wajib bila --with-caddy)
  --listen <addr>     alamat listen arsy (default 127.0.0.1:8787)
  --binary <path>     pakai binary arsy yang sudah dibangun, jangan build
  --with-app          pasang juga app Node (web + api) sebagai service
  --no-app            lewati app Node
  --with-caddy        pasang Caddy sebagai reverse proxy untuk --domain
  --app-dir <path>    direktori app Node (default: <repo>/apps)
  --dry-run           tampilkan rencana tanpa mengubah sistem
  --uninstall         hentikan & hapus service arsy (config tetap disimpan)
  -h, --help          tampilkan bantuan ini

Contoh:
  sudo ./install.sh --domain vps.contoh.id --email admin@contoh.id --with-app --with-caddy
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --domain)     DOMAIN=${2:-}; shift 2 ;;
    --email)      EMAIL=${2:-}; shift 2 ;;
    --listen)     LISTEN=${2:-}; shift 2 ;;
    --binary)     BINARY_SRC=${2:-}; shift 2 ;;
    --app-dir)    APP_DIR=${2:-}; shift 2 ;;
    --with-app)   WITH_APP="yes"; shift ;;
    --no-app)     WITH_APP="no"; shift ;;
    --with-caddy) WITH_CADDY="yes"; shift ;;
    --dry-run)    DRY_RUN="yes"; shift ;;
    --uninstall)  UNINSTALL="yes"; shift ;;
    -h|--help)    usage; exit 0 ;;
    *)            die "opsi tidak dikenal: $1 (lihat --help)" ;;
  esac
done

run() {
  if [ "$DRY_RUN" = "yes" ]; then
    printf '  [dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

write_file() {
  target=$1
  mode=$2
  content=$3
  if [ "$DRY_RUN" = "yes" ]; then
    printf '  [dry-run] tulis %s (mode %s)\n' "$target" "$mode"
    return 0
  fi
  printf '%s' "$content" > "$target"
  chmod "$mode" "$target"
}

require_root() {
  if [ "$DRY_RUN" = "yes" ]; then
    return 0
  fi
  if [ "$(id -u)" -ne 0 ]; then
    die "butuh root: jalankan dengan sudo"
  fi
}

detect_os() {
  case "$(uname -s)" in
    Linux) ;;
    *)
      if [ "$DRY_RUN" = "yes" ]; then
        warn "bukan Linux ($(uname -s)); dry-run tetap lanjut untuk pratinjau"
        return 0
      fi
      die "install.sh hanya untuk Linux (host VPS). Gunakan --binary untuk build manual."
      ;;
  esac
  if [ -r /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    log "OS: ${PRETTY_NAME:-$ID}"
  fi
  arch=$(uname -m)
  case "$arch" in
    x86_64|amd64) GOARCH=amd64 ;;
    aarch64|arm64) GOARCH=arm64 ;;
    *) die "arsitektur tidak didukung: $arch" ;;
  esac
  log "Arsitektur: $arch"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "butuh perintah '$1'"
}

ensure_systemd() {
  if [ "$DRY_RUN" = "yes" ]; then
    return 0
  fi
  if [ ! -d /run/systemd/system ]; then
    die "systemd tidak aktif; arsy dipasang sebagai service systemd"
  fi
}

install_binary() {
  step "Memasang binary arsy"

  if [ -n "$BINARY_SRC" ]; then
    [ -f "$BINARY_SRC" ] || die "binary tidak ditemukan: $BINARY_SRC"
    run install -m 0755 "$BINARY_SRC" "$BIN_PATH"
    log "dari $BINARY_SRC"
    return 0
  fi

  need_cmd go
  log "go: $(go version)"
  if [ "$DRY_RUN" = "yes" ]; then
    log "[dry-run] build $REPO_ROOT/cp/arsy → $BIN_PATH"
    return 0
  fi
  ( cd "$REPO_ROOT/cp/arsy" && CGO_ENABLED=0 GOOS=linux GOARCH="$GOARCH" \
      go build -trimpath -ldflags "-s -w" -o "$BIN_PATH" ./cmd/arsy )
  chmod 0755 "$BIN_PATH"
  log "binary: $BIN_PATH"
}

gen_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
  fi
}

ensure_secret() {
  path=$1
  if [ -s "$path" ]; then
    log "$path sudah ada, dibiarkan"
    return 0
  fi
  if [ "$DRY_RUN" = "yes" ]; then
    log "[dry-run] buat token baru di $path"
    return 0
  fi
  umask 077
  gen_token > "$path"
  chmod 0600 "$path"
  log "$path dibuat (0600)"
}

setup_config() {
  step "Menyiapkan $CONF_DIR"

  run mkdir -p "$CONF_DIR" "$LOG_DIR"
  run chmod 0750 "$CONF_DIR"
  run chmod 0750 "$LOG_DIR"

  ensure_secret "$CONF_DIR/token-admin"
  ensure_secret "$CONF_DIR/token-readonly"

  if [ -f "$CONF_FILE" ]; then
    log "$CONF_FILE sudah ada, dibiarkan"
  else
    write_file "$CONF_FILE" 0640 "$(cat <<EOF
{
  "listen": "$LISTEN",
  "state_path": "$STATE_FILE",
  "audit_path": "$LOG_DIR/audit.jsonl",
  "token_admin_file": "$CONF_DIR/token-admin",
  "token_readonly_file": "$CONF_DIR/token-readonly",
  "allow": {
    "units": ["arsy", "caddy", "docker", "moonwitness-*"],
    "containers": ["moonwitness-*", "arsy-*"],
    "paths": ["$CONF_DIR", "/etc/caddy", "/opt/moonwitness", "/var/lib/moonwitness"],
    "users": ["deploy", "moonwitness"],
    "cron_owners": ["root"]
  }
}
EOF
)"
  fi

  if [ -f "$STATE_FILE" ]; then
    log "$STATE_FILE sudah ada, dibiarkan"
  else
    write_file "$STATE_FILE" 0640 "$(cat <<EOF
{
  "version": 1,
  "resources": [
    { "kind": "dir", "path": "/opt/moonwitness", "mode": "0755" },
    { "kind": "systemd", "name": "arsy", "state": "started", "enabled": true }
  ]
}
EOF
)"
  fi
}

install_unit() {
  step "Memasang arsy.service"

  unit=$(cat <<EOF
[Unit]
Description=arsy control plane
Documentation=file://$REPO_ROOT/docs/superpowers/specs/2026-11-11-arsy-control-plane-design.md
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$BIN_PATH serve --config $CONF_FILE
Restart=on-failure
RestartSec=2
User=$SERVICE_USER
Environment=ARSY_LISTEN=$LISTEN

# Guardrail proses
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=read-only
ProtectSystem=full
ReadWritePaths=$CONF_DIR $LOG_DIR /etc/caddy /opt/moonwitness /var/lib/moonwitness

[Install]
WantedBy=multi-user.target
EOF
)

  write_file "$UNIT_PATH" 0644 "$unit
"
  run systemctl daemon-reload
  run systemctl enable arsy.service
  run systemctl restart arsy.service
  log "arsy.service aktif"
}

setup_app() {
  [ "$WITH_APP" = "no" ] && return 0

  if [ "$WITH_APP" = "ask" ]; then
    if [ ! -d "$REPO_ROOT/apps/web" ]; then
      log "app Node tidak ditemukan, dilewati"
      return 0
    fi
    WITH_APP="no"
  fi

  step "Menyiapkan app Node"
  app_root=${APP_DIR:-$REPO_ROOT}
  need_cmd node
  need_cmd pnpm

  log "node: $(node --version)"
  log "pnpm: $(pnpm --version)"

  run sh -c "cd '$app_root' && pnpm install --frozen-lockfile"
  run sh -c "cd '$app_root' && pnpm build"

  write_app_units "$app_root"
}

write_app_units() {
  app_root=$1

  web_unit=$(cat <<EOF
[Unit]
Description=moonwitness web
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$app_root/apps/web
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=$(command -v pnpm || echo /usr/local/bin/pnpm) start
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
)

  api_unit=$(cat <<EOF
[Unit]
Description=moonwitness api
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$app_root/apps/api
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOST=127.0.0.1
Environment=ARSY_URL=http://$LISTEN
ExecStart=$(command -v pnpm || echo /usr/local/bin/pnpm) start
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
)

  write_file /etc/systemd/system/moonwitness-web.service 0644 "$web_unit
"
  write_file /etc/systemd/system/moonwitness-api.service 0644 "$api_unit
"

  run systemctl daemon-reload
  run systemctl enable moonwitness-api.service moonwitness-web.service
  run systemctl restart moonwitness-api.service moonwitness-web.service
  log "moonwitness-api + moonwitness-web aktif"
}

setup_vpn_tools() {
  step "Menyiapkan tool VPN (WireGuard)"

  if command -v wg >/dev/null 2>&1 && command -v nft >/dev/null 2>&1; then
    log "wireguard-tools dan nftables sudah ada"
  else
    need_cmd apt-get
    run apt-get update -qq
    run apt-get install -y -qq wireguard-tools iproute2 nftables
  fi

  # Teruskan IPv4 agar peer bisa menjangkau subnet internal bila perlu.
  write_file /etc/sysctl.d/90-arsy-vpn.conf 0644 "net.ipv4.ip_forward=1
"
  run sysctl -w net.ipv4.ip_forward=1
  log "vpn siap: aktifkan lewat dashboard atau 'arsy vpn up --endpoint <host>'"
}

setup_caddy() {
  [ "$WITH_CADDY" = "yes" ] || return 0
  [ -n "$DOMAIN" ] || die "--with-caddy butuh --domain"
  [ -n "$EMAIL" ] || die "--with-caddy butuh --email"

  step "Memasang Caddy untuk $DOMAIN"
  need_cmd apt-get

  if ! command -v caddy >/dev/null 2>&1; then
    run apt-get update -qq
    run apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg
    if [ "$DRY_RUN" = "no" ]; then
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
        | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
        > /etc/apt/sources.list.d/caddy-stable.list
      apt-get update -qq
      apt-get install -y -qq caddy
    fi
  fi

  caddyfile=$(cat <<EOF
{
	email $EMAIL
}

$DOMAIN {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
EOF
)

  run mkdir -p /etc/caddy
  write_file /etc/caddy/Caddyfile 0644 "$caddyfile
"
  run systemctl enable caddy
  run systemctl restart caddy
  log "Caddy melayani https://$DOMAIN → 127.0.0.1:3000"
}

doctor() {
  step "Verifikasi"
  if [ "$DRY_RUN" = "yes" ]; then
    log "[dry-run] $BIN_PATH doctor"
    return 0
  fi
  "$BIN_PATH" doctor || warn "doctor melaporkan masalah; periksa output di atas"
  if systemctl is-active --quiet arsy.service; then
    log "arsy.service: active"
  else
    warn "arsy.service tidak aktif; lihat: journalctl -u arsy -n 50"
  fi
}

show_tokens() {
  [ "$DRY_RUN" = "yes" ] && return 0
  step "Token akses"
  log "admin    : $(cat "$CONF_DIR/token-admin")"
  log "readonly : $(cat "$CONF_DIR/token-readonly")"
  log ""
  log "Simpan di tempat aman. Regenerasi: hapus file token lalu jalankan installer lagi."
  log "Uji:  curl -H \"Authorization: Bearer \$(cat $CONF_DIR/token-admin)\" http://$LISTEN/v1/host"
  log "Tunnel: ssh -L 8787:$LISTEN -N user@<vps>"
}

uninstall() {
  step "Melepas arsy"
  run systemctl disable --now arsy.service || true
  run rm -f "$UNIT_PATH"
  run systemctl daemon-reload || true
  run rm -f "$BIN_PATH"
  log "service dan binary dihapus"
  log "config, state, token, dan audit dipertahankan di $CONF_DIR dan $LOG_DIR"
}

ask() {
  # ask "pertanyaan" "default" -> jawaban di $REPLY
  prompt=$1
  default=${2:-}
  if [ -n "$default" ]; then
    printf '  %s [%s]: ' "$prompt" "$default" >&2
  else
    printf '  %s: ' "$prompt" >&2
  fi
  read -r REPLY || REPLY=""
  if [ -z "$REPLY" ]; then
    REPLY=$default
  fi
}

interactive() {
  # hanya interaktif bila stdin adalah tty
  [ -t 0 ] || return 0

  step "Onboarding interaktif"
  log "Tekan Enter untuk menerima nilai default."

  if [ "$WITH_APP" = "ask" ]; then
    ask "Pasang juga app Node (web + api) sebagai service? (yes/no)" "yes"
    case "$REPLY" in
      y|Y|yes|Yes|YES) WITH_APP="yes" ;;
      *) WITH_APP="no" ;;
    esac
  fi

  if [ "$WITH_APP" = "yes" ] && [ -z "$APP_DIR" ]; then
    ask "Direktori app Node" "$REPO_ROOT/apps"
    APP_DIR=$REPLY
  fi

  if [ -z "$DOMAIN" ]; then
    ask "Domain publik untuk dashboard (kosongkan jika tidak pakai HTTPS)" ""
    DOMAIN=$REPLY
  fi

  if [ -n "$DOMAIN" ] && [ "$WITH_CADDY" != "yes" ]; then
    ask "Pasang Caddy sebagai reverse proxy untuk $DOMAIN? (yes/no)" "yes"
    case "$REPLY" in
      y|Y|yes|Yes|YES) WITH_CADDY="yes" ;;
      *) WITH_CADDY="no" ;;
    esac
  fi

  if [ "$WITH_CADDY" = "yes" ] && [ -z "$EMAIL" ]; then
    ask "Email untuk ACME Caddy" ""
    EMAIL=$REPLY
  fi

  if [ "$LISTEN" = "127.0.0.1:8787" ]; then
    ask "Alamat listen arsy" "127.0.0.1:8787"
    LISTEN=$REPLY
  fi

  log ""
  log "Ringkasan:"
  log "  app Node : $WITH_APP"
  log "  domain   : ${DOMAIN:-<tidak ada>}"
  log "  caddy    : $WITH_CADDY"
  log "  listen   : $LISTEN"
  ask "Lanjutkan instalasi? (yes/no)" "yes"
  case "$REPLY" in
    y|Y|yes|Yes|YES) ;;
    *) die "dibatalkan pengguna" ;;
  esac
}

main() {
  step "arsy installer $VERSION"
  if [ "$DRY_RUN" = "yes" ]; then
    log "mode dry-run: tidak ada perubahan sistem"
  fi

  interactive

  if [ "$UNINSTALL" = "yes" ]; then
    require_root
    uninstall
    exit 0
  fi

  require_root
  detect_os
  ensure_systemd
  install_binary
  setup_config
  install_unit
  setup_vpn_tools
  setup_app
  setup_caddy
  doctor
  show_tokens

  printf '\nSelesai.\n'
}

main "$@"
