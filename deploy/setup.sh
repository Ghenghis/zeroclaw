#!/usr/bin/env bash
# deploy/setup.sh
# One-shot VPS setup script for ZeroClaw on Ubuntu 22.04/24.04 (Hostinger VPS)
# Run as root: bash deploy/setup.sh
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-zeroclaw.com}"
APP_USER="${APP_USER:-www-data}"
APP_DIR="/var/www/zeroclaw"
ARCHIVE_DIR="/var/www/archives"
LOG_DIR="/var/log/zeroclaw"
NODE_VERSION="22"

info "=== ZeroClaw VPS Setup ==="
info "Domain: $DOMAIN | App dir: $APP_DIR"

# ── System packages ───────────────────────────────────────────────────────────
info "Updating system packages…"
apt-get update -qq
apt-get install -y -qq \
    curl wget git nginx certbot python3-certbot-nginx \
    zstd build-essential \
    logrotate cron rsync \
    2>/dev/null

# ── Node.js ───────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt "$NODE_VERSION" ]]; then
    info "Installing Node.js $NODE_VERSION…"
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
    apt-get install -y nodejs
fi
info "Node: $(node -v) | npm: $(npm -v)"

# ── Directory structure ───────────────────────────────────────────────────────
info "Creating directory structure…"
mkdir -p "$APP_DIR"/{current,staging,prev}
mkdir -p "$ARCHIVE_DIR"
mkdir -p "$LOG_DIR"
mkdir -p /tmp/timewarp

chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$ARCHIVE_DIR" "$LOG_DIR" /tmp/timewarp
chmod 755 "$APP_DIR" "$ARCHIVE_DIR"

# ── Nginx ─────────────────────────────────────────────────────────────────────
info "Configuring Nginx…"
cp "$(dirname "$0")/nginx.conf" "/etc/nginx/sites-available/zeroclaw"
ln -sf "/etc/nginx/sites-available/zeroclaw" "/etc/nginx/sites-enabled/zeroclaw"
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx
info "Nginx configured"

# ── SSL (Let's Encrypt) ───────────────────────────────────────────────────────
if [[ "$DOMAIN" != "localhost" ]]; then
    info "Obtaining SSL certificate for $DOMAIN…"
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
        --non-interactive --agree-tos \
        --email "admin@$DOMAIN" \
        --redirect 2>/dev/null || warn "SSL setup failed — run manually: certbot --nginx -d $DOMAIN"
fi

# ── Systemd services ──────────────────────────────────────────────────────────
info "Installing systemd services…"
cp "$(dirname "$0")/zeroclaw.service" /etc/systemd/system/
cp "$(dirname "$0")/zeroclaw-scheduler.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable zeroclaw zeroclaw-scheduler
info "Services registered (not yet started — deploy app first)"

# ── Logrotate ─────────────────────────────────────────────────────────────────
info "Installing log rotation…"
cp "$(dirname "$0")/logrotate.conf" /etc/logrotate.d/zeroclaw

# ── Cron for disk monitoring ──────────────────────────────────────────────────
info "Installing disk monitor cron…"
cat > /etc/cron.d/zeroclaw-disk << 'EOF'
# Check disk every 15 minutes
*/15 * * * * www-data curl -sf http://localhost:3000/api/admin/debug > /dev/null 2>&1
# Archive cleanup at 4 AM daily
0 4 * * * www-data find /var/www/archives -name "*.tar.zst" -mtime +365 -delete 2>/dev/null
EOF

# ── Build & deploy ────────────────────────────────────────────────────────────
info "Ready to deploy. Run the following to deploy your app:"
cat << 'DEPLOY'

  # 1. Clone/copy your code to staging:
  rsync -av --delete /your/local/zeroclaw/ /var/www/zeroclaw/staging/ \
    --exclude='.git' --exclude='node_modules' --exclude='.next'

  # 2. Install dependencies and build:
  cd /var/www/zeroclaw/staging
  npm install --production=false
  npm run build

  # 3. Atomic swap (staging → current):
  mv /var/www/zeroclaw/current /var/www/zeroclaw/prev_$(date +%Y%m%d)
  mv /var/www/zeroclaw/staging /var/www/zeroclaw/current

  # 4. Start services:
  systemctl start zeroclaw zeroclaw-scheduler
  systemctl status zeroclaw zeroclaw-scheduler

DEPLOY

info "=== Setup complete! ==="
info "Domain: https://$DOMAIN"
info "App dir: $APP_DIR"
info "Archives: $ARCHIVE_DIR"
info "Logs: $LOG_DIR"
