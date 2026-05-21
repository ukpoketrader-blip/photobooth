# Subprocessors

| Provider | Purpose | Data | Region |
|----------|---------|------|--------|
| Google Cloud / Gemini | AI image styling | Portrait photos (temporary) | EU (`europe-west2` recommended) |
| SumUp | Card payments (optional) | Transaction metadata | UK/EU (per SumUp DPA) |
| Hosting (Vercel / GCP) | App hosting | All application data | EU/UK region selection |
| PostgreSQL host | Database | Metadata, session records | EU/UK |
| Redis host | Job queue | Job IDs | EU/UK |

Update this list when adding email (SendGrid/Postmark) or other services.
