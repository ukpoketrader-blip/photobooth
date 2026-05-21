# GDPR & UK Data Protection

This platform is designed for UK/EU operation with the following controls:

## Lawful basis

- **Guest photos**: Explicit consent at the booth before capture (UK GDPR Article 6(1)(a)).
- **Payment records**: Contract / legitimate interest for transaction records when SumUp is enabled.

## Data minimisation

- No guest accounts.
- Optional hashed IP only (`ipHash`).
- EXIF GPS stripped on upload.
- Payment data: SumUp transaction/checkout IDs only — no card numbers.

## Retention

- Per-instance `retentionDays` (default 7).
- Nightly purge job: `pnpm purge` (worker `src/purge.ts`).
- GCS lifecycle rules recommended in production.

## Data subject rights

- **Erasure**: Admin → Sessions → Erase, or `DELETE /api/admin/sessions/:id`.
- **Transparency**: Per-instance privacy notice HTML in admin.

## Subprocessors

See [subprocessors.md](./subprocessors.md).

## Records of processing

Maintain [ROPA.md](./ROPA.md) for your organisation.

## DPIA

Use [DPIA-template.md](./DPIA-template.md) for high-risk events (large crowds, children, etc.).

## PECR

Marketing opt-in is off by default. Email share requires separate consent if enabled.
