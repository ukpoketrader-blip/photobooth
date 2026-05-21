# Deployment (UK/EU)

For **demo hosting** (domain on GoDaddy, app on Vercel + Railway), see **[DEPLOY-DEMO.md](./DEPLOY-DEMO.md)**.  
For **GoDaddy VPS** (Docker, single server), see **[DEPLOY-GODADDY.md](./DEPLOY-GODADDY.md)**.

## Recommended topology

- **Cloud Run** (`europe-west2`): `api`, `worker`
- **Vercel** (London / EU): `booth`, `admin`
- **Cloud SQL** (Postgres, EU) + **Memorystore** or Upstash Redis (EU)
- **GCS** bucket `europe-west2` with lifecycle delete

## Environment variables

Copy `.env.example` to your secret manager. Required in production:

- `DATABASE_URL`, `REDIS_URL`
- `AUTH_SECRET`, `BOOTH_JWT_SECRET`
- `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`
- `GCS_BUCKET`, `GOOGLE_APPLICATION_CREDENTIALS`
- `SUMUP_*` if payments enabled

## Webhooks

Register SumUp webhook URL: `https://api.yourdomain.com/api/webhooks/sumup`

## Cron

Schedule `pnpm purge` daily (Cloud Scheduler → Cloud Run job) for retention compliance.

## CI

GitHub Actions workflow runs on push to `main` — see `.github/workflows/ci.yml`.
