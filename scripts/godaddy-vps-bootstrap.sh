#!/usr/bin/env bash
# Optional one-shot setup on a fresh Ubuntu VPS (run as root or sudo).
# Usage: curl -fsSL ... | bash   OR   bash scripts/godaddy-vps-bootstrap.sh
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! command -v docker compose >/dev/null 2>&1; then
  echo "Docker Compose plugin should be included with Docker CE."
  exit 1
fi

apt-get update -qq
apt-get install -y -qq git gettext-base

REPO_DIR="${REPO_DIR:-/opt/photobooth}"
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Clone your repo into $REPO_DIR first, e.g.:"
  echo "  git clone https://github.com/YOUR_ORG/photobooth.git $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR"

if [ ! -f .env ]; then
  cp deploy/env.production.example .env
  echo "Created .env — edit $REPO_DIR/.env before continuing."
  exit 0
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ ! -f deploy/Caddyfile ]; then
  envsubst < deploy/Caddyfile.template > deploy/Caddyfile
  echo "Generated deploy/Caddyfile"
fi

docker compose -f docker-compose.prod.yml --env-file .env up -d --build

echo ""
echo "Stack starting. Check: docker compose -f docker-compose.prod.yml ps"
echo "Booth:  ${NEXT_PUBLIC_BOOTH_URL:-https://booth.yourdomain.com}/b/demo-booth"
echo "Admin:  ${NEXT_PUBLIC_ADMIN_URL:-https://admin.yourdomain.com}"
