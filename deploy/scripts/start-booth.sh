#!/bin/sh
set -e
cd /app/apps/booth
echo "Starting booth on :3000..."
exec pnpm start
