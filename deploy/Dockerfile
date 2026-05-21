# Event Lab photobooth — production image (API, worker, booth, admin)
FROM node:20-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates libvips42 gettext-base \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/booth/package.json apps/booth/
COPY apps/admin/package.json apps/admin/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/services/package.json packages/services/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS build
COPY . .

ARG API_URL=http://api:3002
ARG NEXT_PUBLIC_BOOTH_URL=http://localhost:3000
ARG NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
ENV API_URL=$API_URL \
  NEXT_PUBLIC_BOOTH_URL=$NEXT_PUBLIC_BOOTH_URL \
  NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL \
  NEXT_PUBLIC_API_URL=

RUN pnpm db:generate
RUN pnpm --filter @photobooth/booth build
RUN pnpm --filter @photobooth/admin build

# --- Runtime ---
FROM base AS runner
WORKDIR /app
COPY --from=build /app .
RUN chmod +x deploy/scripts/*.sh
ENV NODE_ENV=production
