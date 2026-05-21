#!/bin/sh
set -e
cd /app/apps/admin
echo "Starting admin on :3001..."
exec pnpm start
