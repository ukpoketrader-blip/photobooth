#!/bin/sh
set -e
cd /app
mkdir -p "${STORAGE_LOCAL_PATH:-/data/uploads}"
echo "Starting API on port ${API_PORT:-3002}..."
exec pnpm --filter @photobooth/api exec tsx src/index.ts
