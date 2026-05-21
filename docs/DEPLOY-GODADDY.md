# Deploying on GoDaddy VPS (Docker)

> **Easier and cheaper for most demos:** keep your domain on GoDaddy and host on Vercel + Railway — see **[DEPLOY-DEMO.md](./DEPLOY-DEMO.md)** (~£0–5/month, no server admin).

This guide is for running **everything on one GoDaddy VPS** with Docker. Use it if you want one invoice and full control, not the lowest-effort path.

## What works on GoDaddy (and what does not)

| GoDaddy product | Suitable? | Why |
|-----------------|-----------|-----|
| **Shared / Web Hosting** (cPanel, PHP) | No | No long-running Node, Postgres, Redis, or background worker |
| **Node.js Hosting (beta PaaS)** | No | Single app per deploy, no monorepo, no Docker, **MySQL only** (this stack needs **Postgres + Redis**) |
| **VPS / Dedicated** (you manage the server) | **Yes** | Install Docker, run the full stack with `docker-compose.prod.yml` |
| **Domain only** on GoDaddy | Yes (hybrid) | Point DNS to another host (Vercel + managed Postgres) — see [DEPLOY.md](./DEPLOY.md) |

**Recommendation:** Use a **GoDaddy VPS** (self-managed, 4 GB RAM minimum) and deploy with Docker, **or** keep the domain on GoDaddy and host the app on Vercel + a small EU API host (faster to operate, still “your domain” for clients).

---

## Architecture on a GoDaddy VPS

```
                    Internet
                        │
                   ┌────▼────┐
                   │  Caddy  │  :443 HTTPS (Let's Encrypt)
                   └────┬────┘
        ┌───────────────┼───────────────┐
        │               │               │
   booth:3000      admin:3001       api:3002
        │               │               │
        └───────────────┴───────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    │  worker (BullMQ)      │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │ Postgres + Redis      │
                    └───────────────────────┘
```

Suggested hostnames (replace with your domain):

| URL | Service |
|-----|---------|
| `https://booth.yourdomain.com` | Guest kiosk |
| `https://admin.yourdomain.com` | Operator admin |
| `https://api.yourdomain.com` | REST API + webhooks + image files |

DNS in GoDaddy: three **A records** pointing to your VPS public IP.

---

## Prerequisites

1. **GoDaddy VPS** (Linux, Ubuntu 22.04 or 24.04 recommended) with root SSH access.
2. **Domain** in GoDaddy (or elsewhere) with DNS you can edit.
3. **Gemini API key** — [Google AI Studio](https://aistudio.google.com/apikey) (required for AI photos).
4. Ports **80** and **443** open on the VPS firewall (GoDaddy panel + OS `ufw` if enabled).

Optional for demos: skip SumUp and GCS; use **local disk storage** (default in `.env.production.example`).

---

## Quick deploy (Docker on VPS)

### 1. SSH into the VPS

```bash
ssh root@YOUR_VPS_IP
```

### 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
# log out and back in so docker group applies
```

### 3. Clone the project

```bash
git clone https://github.com/YOUR_ORG/photobooth.git
cd photobooth
```

### 4. Configure environment

```bash
cp deploy/env.production.example .env
nano .env   # fill in domains, secrets, GEMINI_API_KEY
```

Generate secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # BOOTH_JWT_SECRET
```

Set at minimum:

- `POSTGRES_PASSWORD` — strong password
- `BOOTH_DOMAIN`, `ADMIN_DOMAIN`, `API_DOMAIN` — your three subdomains
- `NEXT_PUBLIC_BOOTH_URL`, `NEXT_PUBLIC_ADMIN_URL`, `API_URL` — matching `https://…` URLs
- `GEMINI_API_KEY`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — change from defaults before sharing

### 5. Build Caddy config from your domains

```bash
export $(grep -v '^#' .env | xargs)
envsubst < deploy/Caddyfile.template > deploy/Caddyfile
```

(`envsubst` is in the `gettext` package: `apt install gettext-base`.)

### 6. Start the stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

First boot runs database migrations and seed (demo booth + admin user).

### 7. Verify

```bash
docker compose -f docker-compose.prod.yml ps
curl -s https://api.YOUR_DOMAIN/health
```

Open:

- `https://booth.YOUR_DOMAIN/b/demo-booth`
- `https://admin.YOUR_DOMAIN` — log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`

---

## GoDaddy DNS (A records)

In **GoDaddy → DNS → Manage**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `booth` | VPS public IP | 600 |
| A | `admin` | VPS public IP | 600 |
| A | `api` | VPS public IP | 600 |

Wait 5–30 minutes for propagation. Caddy will obtain TLS certificates automatically on first HTTPS request.

---

## Demo checklist for client meetings

1. Seed creates **`demo-booth`** — share the booth URL above.
2. Create a **new instance** in admin with the client’s branding (primary colour, filters).
3. Use a **laptop + webcam** or a tablet in kiosk mode; HTTPS is required for camera on most browsers.
4. **Print** only works on a Windows PC with the print bridge — skip for remote demos unless that machine is on site.
5. **SumUp** needs a real merchant token and public webhook URL (`https://api.YOUR_DOMAIN/api/webhooks/sumup`) — optional for first meetings; use **Simulate payment** in dev or enable later.

---

## Updates after code changes

```bash
cd photobooth
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 502 / blank page | `docker compose -f docker-compose.prod.yml logs api booth admin` |
| Camera blocked | Must use **HTTPS** booth URL, not IP address |
| AI stuck on processing | `GEMINI_API_KEY`, worker logs: `docker compose … logs worker` |
| Admin login fails | `ADMIN_EMAIL` / `ADMIN_PASSWORD`, API health, `AUTH_SECRET` unchanged after first boot |
| Images 404 | `API_URL` must match the public API base; storage volume `photobooth_uploads` |
| SSL not issued | DNS must point to VPS; ports 80/443 open; correct `deploy/Caddyfile` |

---

## Cost-conscious alternative (domain on GoDaddy, app elsewhere)

If VPS ops are too heavy for a short demo:

1. Keep **DNS** on GoDaddy.
2. Deploy **booth** + **admin** to [Vercel](https://vercel.com) (EU region).
3. Deploy **api** + **worker** to [Railway](https://railway.app), [Render](https://render.com), or **Fly.io** (EU).
4. Use [Neon](https://neon.tech) (Postgres) + [Upstash](https://upstash.com) (Redis).

Point `booth`, `admin`, and `api` CNAME/A records to those providers. See [DEPLOY.md](./DEPLOY.md) for env vars.

---

## Security notes for a public test server

- Change **admin password** immediately; do not use `changeme`.
- Use strong `POSTGRES_PASSWORD` and random `AUTH_SECRET` / `BOOTH_JWT_SECRET`.
- Restrict VPS SSH to your IP if possible.
- Rotate **Gemini** key if it was ever committed to git.
- Set a short **retention** on demo instances (admin → instance → retention days).
- Tear down the VPS when the pilot ends to avoid ongoing cost and exposure.

---

## Related files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production stack |
| `deploy/Dockerfile` | Monorepo image |
| `deploy/env.production.example` | Env template |
| `deploy/Caddyfile.template` | HTTPS reverse proxy |
| `scripts/godaddy-vps-bootstrap.sh` | Optional one-shot VPS setup |
