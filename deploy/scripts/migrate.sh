#!/bin/sh
set -e
cd /app
echo "Running database push..."
pnpm --filter @photobooth/db exec prisma db push
echo "Seeding demo data (idempotent where supported)..."
pnpm db:seed || true
echo "Migrations complete."
