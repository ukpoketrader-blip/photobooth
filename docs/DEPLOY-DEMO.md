# Easiest demo hosting (GoDaddy domain + free/cheap cloud)

Keep your **domain on GoDaddy**. Host the app on managed services with generous free tiers. Typical cost for a client demo:

| Item | Cost |
|------|------|
| GoDaddy domain | You already have it (~£10–15/year renewal) |
| [Vercel](https://vercel.com) (booth + admin) | **£0** on Hobby |
| [Neon](https://neon.tech) (Postgres) | **£0** on Free (0.5 GB) |
| [Upstash](https://upstash.com) (Redis) | **£0** on Free |
| [Railway](https://railway.com) (API + worker) | **~£5/month** Hobby credit (often enough for a light demo) |
| Google Gemini (AI photos) | Pay-per-use ([AI Studio](https://aistudio.google.com/apikey)) |

**Total: about £0–5/month** plus domain renewal and AI usage — much simpler than running a VPS.

---

## What you will have when done

| URL | What |
|-----|------|
| `https://booth.yourdomain.com` | Guest kiosk (`/b/demo-booth`) |
| `https://admin.yourdomain.com` | Operator dashboard |
| `https://api.yourdomain.com` | API + image files + webhooks |

---

## Overview (30–60 minutes)

1. **Neon** — Postgres database  
2. **Upstash** — Redis for the AI job queue  
3. **Railway** — API + worker (always on)  
4. **Vercel** — booth + admin (two projects, same GitHub repo)  
5. **GoDaddy DNS** — point subdomains at Vercel and Railway  
6. **Seed** — create demo booth + admin user  

---

## 1. Neon (database)

1. Sign up at [neon.tech](https://neon.tech) → **New project** (pick **EU** region if offered).  
2. Copy the **connection string** (pooled URL is fine).  
3. It looks like:  
   `postgresql://user:pass@ep-xxx.eu-west-1.aws.neon.tech/neondb?sslmode=require`

   **Important for Railway:** Prisma often fails if the URL includes `&channel_binding=require`. Use **only** `?sslmode=require` (copy the pooled connection string from Neon and strip `channel_binding` if present).  
4. Save as `DATABASE_URL` for later.

Run schema once from your PC (with the repo cloned):

```bash
# In project root — paste your Neon DATABASE_URL
set DATABASE_URL=postgresql://...
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
```

Note the seed output: **demo booth** slug and **admin password**.

---

## 2. Upstash (Redis)

1. [console.upstash.com](https://console.upstash.com) → **Create database** → type **Redis**, region close to EU.  
2. Copy the **Redis URL** (`rediss://...`).  
3. Save as `REDIS_URL`.

---

## 3. Railway (API + worker)

Railway runs the backend and the background AI worker. One GitHub repo, **two services only**.

### Important: Railway may create 5 services

If you import a **pnpm monorepo**, Railway often auto-creates a service for every package with a `start` script (`api`, `worker`, `booth`, `admin`, `print-bridge`).

**Keep only `api` and `worker`.** Delete the others:

| Service | Action |
|---------|--------|
| `@photobooth/api` | **Keep** |
| `@photobooth/worker` | **Keep** |
| `@photobooth/booth` | **Delete** → deploy on **Vercel** instead |
| `@photobooth/admin` | **Delete** → deploy on **Vercel** instead |
| `@photobooth/print-bridge` | **Delete** → runs on the **Windows kiosk PC** only, not in the cloud |

To delete: open the service → **Settings** → scroll down → **Delete service**.

`booth` / `admin` crash on Railway because they are **Next.js** apps meant for Vercel, not Railway’s default Node start.

### 3a. New project

1. [railway.app](https://railway.app) → **New project** → **Deploy from GitHub** → select your `photobooth` repo.  
2. If Railway created 5 services, delete `booth`, `admin`, and `print-bridge` as above.  
3. Rename the API service to **`api`** and ensure **`worker`** exists (add from GitHub if you started with only one).

### Dev access password (protect Gemini credits)

While the booth URL is public, set on the **`api`** service only:

```env
BOOTH_ACCESS_PASSWORD=your-private-preview-password
```

Guests must enter this password before starting a session. The password is **never** sent to Vercel (only verified by the API). Remove the variable when you go fully public.

Token lasts **24 hours** per browser (`sessionStorage`).

### 3b. Configure the `api` service

**Settings → General**

| Setting | Value |
|---------|--------|
| Root Directory | **Empty** (repo root `/`) — **not** `apps/api` |
| Watch Paths | `apps/api/**`, `packages/**` |

If Root Directory is `apps/api`, the build uses `pnpm i --frozen-lockfile` against a stale slice of the lockfile and fails with `ERR_PNPM_OUTDATED_LOCKFILE`. Fix: clear Root Directory, save, **Redeploy** (enable **Clear build cache** if offered).

**Settings → Deploy → Custom start command**

```bash
pnpm --filter @photobooth/api exec tsx src/index.ts
```

**Settings → Networking → Generate domain**  
You get something like `photobooth-api-production.up.railway.app` — use this until custom domain is set.

**Variables** (Settings → Variables) — add all of these:

```env
NODE_ENV=production
DATABASE_URL=<from Neon>
REDIS_URL=<from Upstash>
API_PORT=3002

AUTH_SECRET=<openssl rand -base64 32>
BOOTH_JWT_SECRET=<openssl rand -base64 32>
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=<strong password>

GEMINI_API_KEY=<from Google AI Studio>
GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview

API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BOOTH_URL=https://booth.yourdomain.com
NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com

STORAGE_LOCAL_PATH=/data/uploads
DATA_REGION=EU/UK
DEFAULT_RETENTION_DAYS=7
```

Use your **real domain names** in `API_URL` / `NEXT_PUBLIC_*` even before DNS is live (needed for QR/share links).

**Storage (Railway cannot share one volume across services)**

Railway gives each service its **own** volume. The app supports that: the **api** holds all guest photos; the **worker** fetches originals over HTTPS and copies finished images back to the api.

### `api` service

1. **Volume:** mount `api-volume` at `/data/uploads` (500 MB is fine for demos).  
2. Variables:

```env
STORAGE_LOCAL_PATH=/data/uploads
API_URL=https://api.yourdomain.com
WORKER_STORAGE_SECRET=<same random secret on worker — see below>
```

### `worker` service

1. **No volume required** (or keep `worker-volume` only as scratch — not used for guest photos).  
2. Variables:

```env
STORAGE_LOCAL_PATH=/tmp/worker-cache
API_URL=https://api.yourdomain.com
WORKER_STORAGE_SECRET=<paste the same secret as api>
STORAGE_MIRROR_TO_API=true
```

Generate a secret once (PowerShell):

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
```

Redeploy **api** and **worker** after changing variables. Take a **new** photo to test (old sessions may reference missing files).

**Do not** rely on two separate volumes (`api-volume` + `worker-volume`) without `STORAGE_MIRROR_TO_API` — you will get `ENOENT` on `/data/uploads/captures/...`.

### 3c. Add the `worker` service

1. In the same Railway project: **+ New** → **GitHub Repo** → same repository.  
2. Rename service to **`worker`**.

**Custom start command**

```bash
pnpm --filter @photobooth/worker exec tsx src/index.ts
```

**Settings → Source**

| Setting | Value |
|---------|--------|
| Root Directory | **Empty** (same as `api`) — if set to `apps/worker`, the build may still work via `apps/worker/nixpacks.toml`, but empty root is preferred |
| Custom start command | `pnpm --filter @photobooth/worker exec tsx src/index.ts` |

**Variables** — copy the same env vars as `api` (especially `DATABASE_URL`, `REDIS_URL`, `GEMINI_API_KEY`, `STORAGE_LOCAL_PATH`).  
**Attach the same volume** at `/data/uploads` (Railway: share volume between services in one project).

If the worker build log shows `pnpm i --frozen-lockfile` and `ERR_PNPM_OUTDATED_LOCKFILE`: clear **Root Directory**, enable **Clear build cache**, redeploy. The repo includes `apps/worker/nixpacks.toml` so installs run `cd ../.. && pnpm install` from the monorepo root.

### 3d. Custom domain on Railway (`api`)

1. Service **`api`** → **Settings → Networking → Custom Domain** → `api.yourdomain.com`.  
2. Railway shows a **CNAME** target (e.g. `xxxx.up.railway.app`).  
3. Add that CNAME in GoDaddy (step 5 below).

Health check: `https://api.yourdomain.com/health` → `{"status":"ok",...}`.

---

## 4. Vercel (booth + admin)

Create **two** Vercel projects from the **same** GitHub repository.

### Prisma warning on Vercel (`Could not find your Prisma schema`)

**Admin** and **booth** do not use Prisma. Vercel still runs `pnpm install` on the whole monorepo, which triggers `@prisma/client` postinstall.

The repo sets `PRISMA_GENERATE_SKIP_AUTOINSTALL=true` in `apps/admin/vercel.json` and `apps/booth/vercel.json` to skip that step. **Safe to ignore** if the build succeeds.

Prisma is only required on **Railway `api` / `worker`** (`pnpm db:generate` in the build).

### 4a. Project: `photobooth-booth`

| Setting | Value |
|---------|--------|
| Framework | Next.js |
| Root Directory | `apps/booth` |

**Environment variables** (Production):

```env
API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BOOTH_URL=https://booth.yourdomain.com
NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com
```

By default, booth calls `/api/...` on the same host (Vercel rewrites to `API_URL`). That is fine for small requests.

**If photo upload fails with 502** on `/api/public/sessions/.../captures`, set on the **booth** Vercel project:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

The browser then uploads directly to Railway (avoids Vercel proxy timeouts). Ensure Railway **api** has `NEXT_PUBLIC_BOOTH_URL=https://booth.yourdomain.com` so CORS allows it.

Otherwise, if Vercel requires a non-empty `NEXT_PUBLIC_API_URL`, use the booth URL (same-origin proxy).

Deploy → **Settings → Domains** → add `booth.yourdomain.com`.

### 4b. Project: `photobooth-admin`

| Setting | Value |
|---------|--------|
| Root Directory | `apps/admin` |

**Environment variables** (Production):

```env
API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BOOTH_URL=https://booth.yourdomain.com
NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com
```

Do **not** add `NEXT_PUBLIC_API_URL`, or set it to **`NEXT_PUBLIC_ADMIN_URL`** if Vercel requires a non-empty value.

Deploy → add domain `admin.yourdomain.com`.

Vercel may ask you to use their nameservers or add DNS records in GoDaddy — **use the DNS records Vercel shows** (usually CNAME), not a full NS change, unless you prefer that.

---

## 5. GoDaddy DNS

In **GoDaddy → My Products → DNS → Manage** for your domain:

| Type | Name | Value | Notes |
|------|------|--------|--------|
| CNAME | `booth` | `cname.vercel-dns.com` (or value Vercel shows) | Booth kiosk |
| CNAME | `admin` | Vercel target for admin project | Admin |
| CNAME | `api` | Railway CNAME target | API |

TTL: 600 seconds (10 min) is fine. Propagation can take 5–30 minutes.

---

## 6. After DNS propagates

1. Open `https://admin.yourdomain.com` → log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from seed (or Railway vars if you changed them).  
2. Open `https://booth.yourdomain.com/b/demo-booth` on a **HTTPS** URL with a webcam.  
3. In admin, tweak filters/branding for each client pitch.

**SumUp (optional later)**  
Webhook URL: `https://api.yourdomain.com/api/webhooks/sumup` — configure in SumUp when you enable payments.

---

## 7. Redeploy / updates

| Part | How |
|------|-----|
| Booth / Admin | Push to `main` → Vercel auto-deploys |
| API / Worker | Push to `main` → Railway auto-deploys |
| Database schema | `pnpm db:push` locally against Neon URL, or Railway one-off shell |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Admin/booth “Failed to fetch” | `API_URL` on Vercel must match live API; check `https://api.yourdomain.com/health` |
| **502 on `/captures`** after taking a photo | Open `https://api.yourdomain.com/health/ready` — fix any `degraded` check. Set booth `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`. Mount volume on **api + worker**. |
| Stuck on “Working our magic” | Worker not processing: check Railway **worker** logs, `REDIS_URL`, `GEMINI_API_KEY` on api **and** worker, shared volume |
| AI never finishes | Railway **worker** running? `GEMINI_API_KEY` set on **both** api and worker? |
| Images 404 | Railway **volume** mounted on api **and** worker at `/data/uploads` |
| Camera blocked | Use **https://booth.…** not `*.vercel.app` unless that domain is allowed |
| CORS errors | `NEXT_PUBLIC_BOOTH_URL` / `NEXT_PUBLIC_ADMIN_URL` must match real Vercel/custom URLs on API service |
| Seed / no demo booth | Re-run `pnpm db:seed` with Neon `DATABASE_URL` |

---

## When to use something else

| Situation | Better option |
|-----------|----------------|
| Want one bill, one dashboard | [DEPLOY-GODADDY.md](./DEPLOY-GODADDY.md) VPS + Docker (~£6–12/mo, more ops) |
| Production at scale | [DEPLOY.md](./DEPLOY.md) Cloud Run + Vercel EU + GCS |
| Railway credit runs out | Render paid web service (~$7) or small Hetzner VPS |

---

## Security before sharing publicly

- Strong `ADMIN_PASSWORD`; never use `changeme` on the internet.  
- Rotate `GEMINI_API_KEY` if it was ever in git.  
- Short **retention** on demo instances (admin → instance settings).
