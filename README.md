# AI Photobooth Platform (UK/EU)

Multi-tenant SaaS photobooth: kiosk guest app, admin portal, API, and AI worker.

- **AI**: Google Gemini image models (configure `GEMINI_IMAGE_MODEL` for Nano Banana Pro / Gemini 3 Pro Image when available on your API tier)
- **Payments**: Optional SumUp gate per booth instance
- **Branding**: PNG frame overlays composited after AI
- **GDPR**: Consent, retention purge, erasure APIs — see [docs/GDPR.md](docs/GDPR.md)

## Stack

| App | Port | Description |
|-----|------|-------------|
| `apps/booth` | 3000 | Guest kiosk (Next.js) |
| `apps/admin` | 3001 | Operator dashboard |
| `apps/api` | 3002 | REST API (Hono) |
| `apps/worker` | — | BullMQ AI + frame jobs |

## Google AI Studio (take real AI photos)

See [docs/GEMINI-SETUP.md](docs/GEMINI-SETUP.md). Add `GEMINI_API_KEY` to `.env`, then restart **API** and **worker**.

Print output is **6×4″ portrait** (1200×1800 @ 300 DPI) for dye-sub printers; the booth preview matches that aspect ratio.

## Publish to GitHub

See [docs/GITHUB-SETUP.md](docs/GITHUB-SETUP.md) or run:

```powershell
.\scripts\publish-to-github.ps1
```

## Quick start

```bash
# Prerequisites: Node 20+, pnpm 9+, Docker (for Postgres/Redis)

cp .env.example .env
docker compose up -d

pnpm install
pnpm db:generate
pnpm db:push   # or: pnpm db:migrate
pnpm db:seed

# Terminal 1–4:
pnpm --filter @photobooth/api dev
pnpm --filter @photobooth/worker dev
pnpm --filter @photobooth/booth dev
pnpm --filter @photobooth/admin dev
```

- **Booth**: http://localhost:3000/b/demo-booth  
- **Admin**: http://localhost:3001 (login: `admin@example.com` / `changeme`)

## SumUp (optional)

1. Connect merchant token in Admin → Payments.
2. Enable **Require payment** on a booth instance and set price in pence.
3. Point SumUp webhooks to `POST /api/webhooks/sumup`.
4. Dev: use **Simulate payment** on the booth pay screen.

## Demo hosting (easiest — domain on GoDaddy)

See **[docs/DEPLOY-DEMO.md](docs/DEPLOY-DEMO.md)** — **recommended**: Vercel (booth + admin) + Railway (API + worker) + Neon + Upstash (~£0–5/month).

For a single-server Docker deploy (GoDaddy VPS), see **[docs/DEPLOY-GODADDY.md](docs/DEPLOY-GODADDY.md)**.

## Production (EU)

- Deploy API/worker to **Cloud Run** (`europe-west2`) or similar.
- Postgres + Redis in EU regions.
- Set `GCS_BUCKET` and `GOOGLE_APPLICATION_CREDENTIALS` for object storage.
- Vercel EU for booth/admin frontends; set `NEXT_PUBLIC_API_URL`.

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for CI.

## Purge expired sessions (cron)

```bash
pnpm purge
```

Schedule daily on your worker host for GDPR retention compliance.
