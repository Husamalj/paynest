# Customer Readiness Roadmap

These items are required before broad paid rollout. They need external services, business decisions, or real credentials, so they cannot be fully completed in code without operator input.

## Storage

- Move durable uploaded files from database base64 columns to private object storage.
- Recommended: Supabase Storage or S3-compatible storage with private buckets.
- Keep database rows as metadata only: bucket, object key, MIME type, size, checksum, uploader, company ID.
- Add signed download URLs scoped by company and role.

## Billing

- Decide payment provider: Stripe, bank transfer/manual invoicing, or local gateway.
- Define plan catalog: employee limit, price, trial days, support level.
- Add company subscription states: `trialing`, `active`, `past_due`, `suspended`, `cancelled`.
- Enforce plan limits server-side, not only in UI.
- Add invoice/payment audit events.

## Support

- Create a support channel and SLA.
- Use `requestId` in support tickets.
- Keep a demo tenant with fake data for sales calls.
- Keep a rollback plan for every schema or billing change.

## Security

- Enable external uptime monitoring for `/api/health?strict=1`.
- Enable Sentry or Vercel log drain.
- Run OWASP ZAP on staging/preview release candidates.
- Run k6 smoke on staging/preview release candidates.

## Data Operations

- Run a monthly restore drill into staging.
- Document who can access production data.
- Export customer data on request: employees, attendance, payroll, leaves, audit logs.
