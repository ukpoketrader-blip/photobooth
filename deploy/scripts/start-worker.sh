#!/bin/sh
set -e
cd /app
echo "Starting AI worker..."
exec pnpm --filter @photobooth/worker exec tsx src/index.ts
