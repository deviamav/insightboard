#!/usr/bin/env bash
# One-command production deploy for Ubuntu 22.04+
# Usage: sudo bash deploy.sh
set -euo pipefail

DOMAIN="${DOMAIN:-insightboard.example.com}"
ACME_EMAIL="${ACME_EMAIL:-ops@example.com}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

if [[ "${EUID}" -ne 0 ]]; then
  err "Run as root: sudo bash deploy.sh"
  exit 1
fi

# ── 1. Docker ────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
else
  log "Docker already installed"
fi

# ── 2. .env with strong secrets ──────────────────────────────────────────────
if [[ ! -f .env ]]; then
  log "Creating .env with generated secrets..."
  POSTGRES_PASSWORD="$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)"
  ADMIN_SECRET="$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)"
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"

  cat > .env <<EOF
# Auto-generated $(date -u +%Y-%m-%dT%H:%M:%SZ) — keep this file secret!
DOMAIN=${DOMAIN}
ACME_EMAIL=${ACME_EMAIL}
POSTGRES_USER=insightboard
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=insightboard
ADMIN_SECRET=${ADMIN_SECRET}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${ADMIN_PASSWORD}
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://${DOMAIN}
EOF
  chmod 600 .env
  warn "Saved .env — back it up now! Login: admin / ADMIN_PASSWORD in .env"
else
  chmod 600 .env
  POSTGRES_PASSWORD="$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2- || true)"
  ADMIN_SECRET="$(grep '^ADMIN_SECRET=' .env | cut -d= -f2- || true)"
  if [[ -z "${POSTGRES_PASSWORD}" || -z "${ADMIN_SECRET}" ]]; then
    err ".env is missing POSTGRES_PASSWORD or ADMIN_SECRET"
    exit 1
  fi
  if ! grep -q "^ADMIN_PASSWORD=" .env 2>/dev/null; then
    err ".env is missing ADMIN_PASSWORD (login password for admin user)"
    exit 1
  fi
  if [[ ${#ADMIN_SECRET} -lt 32 ]]; then
    err "ADMIN_SECRET must be at least 32 characters"
    exit 1
  fi
  log "Using existing .env"
fi

# Ensure DOMAIN in .env
if ! grep -q "^DOMAIN=" .env 2>/dev/null; then
  echo "DOMAIN=${DOMAIN}" >> .env
fi
if ! grep -q "^ACME_EMAIL=" .env 2>/dev/null; then
  echo "ACME_EMAIL=${ACME_EMAIL}" >> .env
fi
if ! grep -q "^NEXT_PUBLIC_APP_URL=" .env 2>/dev/null; then
  echo "NEXT_PUBLIC_APP_URL=https://${DOMAIN}" >> .env
fi

# ── 3. Firewall (UFW) ──────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  log "Configuring UFW..."
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp
  ufw allow 80/tcp comment 'HTTP LetsEncrypt'
  ufw allow 443/tcp comment 'HTTPS'
  ufw allow 443/udp comment 'HTTP/3'
  if ufw status | grep -q "Status: inactive"; then
    ufw default deny incoming
    ufw default allow outgoing
    ufw --force enable
    log "UFW enabled — only 22, 80, 443 (+ established)"
  else
    log "UFW already active — ensured 22/80/443 are allowed"
  fi
else
  warn "UFW not found — open only ports 22, 80, 443 in your firewall"
fi

# ── 4. DNS check ─────────────────────────────────────────────────────────────
SERVER_IP="$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
DNS_IP="$(dig +short "${DOMAIN}" A 2>/dev/null | tail -1 || true)"
if [[ -n "$DNS_IP" && -n "$SERVER_IP" && "$DNS_IP" != "$SERVER_IP" ]]; then
  warn "DNS ${DOMAIN} -> ${DNS_IP}, but server IP is ${SERVER_IP}"
  warn "Point A-record to ${SERVER_IP} before HTTPS will work"
else
  log "DNS check OK (${DOMAIN} -> ${DNS_IP:-unknown})"
fi

# ── 5. Build & start ─────────────────────────────────────────────────────────
log "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

log "Waiting for app to become healthy..."
for i in $(seq 1 60); do
  APP_CID="$(docker compose -f docker-compose.prod.yml ps -q app 2>/dev/null || true)"
  if [[ -n "$APP_CID" ]]; then
    STATUS="$(docker inspect --format='{{.State.Health.Status}}' "$APP_CID" 2>/dev/null || echo "starting")"
    if [[ "$STATUS" == "healthy" ]]; then
      log "App is healthy"
      break
    fi
  fi
  if [[ "$i" -eq 60 ]]; then
    warn "Health check timeout — app logs:"
    docker compose -f docker-compose.prod.yml logs --tail=80 app || true
  fi
  sleep 3
done
docker compose -f docker-compose.prod.yml ps

APP_CID="$(docker compose -f docker-compose.prod.yml ps -q app 2>/dev/null || true)"
if [[ -n "$APP_CID" ]]; then
  APP_STATUS="$(docker inspect --format='{{.State.Status}}' "$APP_CID" 2>/dev/null || echo "unknown")"
  if [[ "$APP_STATUS" != "running" ]]; then
    err "App container is not running (status: $APP_STATUS). Last logs:"
    docker compose -f docker-compose.prod.yml logs --tail=100 app || true
    exit 1
  fi
fi

# ── 6. Security summary ──────────────────────────────────────────────────────
echo ""
log "══════════════════════════════════════════════════════════"
log "  Deploy complete: https://${DOMAIN}"
log "══════════════════════════════════════════════════════════"
echo ""
echo "  Login:         https://${DOMAIN}/ru/login  (admin + ADMIN_PASSWORD from .env)"
echo "  Users:         https://${DOMAIN}/ru/users  (admin only)"
echo "  Dashboard:     https://${DOMAIN}/ru"
echo "  Data entry:    https://${DOMAIN}/ru/admin/data  (Tools menu)"
echo ""
echo "  Security:"
echo "    ✓ PostgreSQL — internal Docker network only (no host port)"
echo "    ✓ App        — internal network, exposed only via Caddy"
echo "    ✓ HTTPS      — automatic Let's Encrypt certificate"
echo "    ✓ UFW        — only 22, 80, 443 open"
echo "    ✓ Secrets    — in .env (chmod 600), not in Docker image"
echo ""
warn "  Login: username=admin, password=ADMIN_PASSWORD in .env"
echo ""
echo "  Commands:"
echo "    docker compose -f docker-compose.prod.yml logs -f"
echo "    docker compose -f docker-compose.prod.yml restart"
echo "    docker compose -f docker-compose.prod.yml down"
echo ""
