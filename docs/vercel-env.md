# Vercel Environment Variables

Set these in Vercel Project Settings > Environment Variables. Do not commit real values.

## Required

- `DATABASE_URL`: pooled PostgreSQL runtime connection.
- `DIRECT_URL`: direct PostgreSQL connection for Prisma operations.
- `JWT_SECRET`: long random value, at least 48 characters.
- `NEXT_PUBLIC_APP_URL`: production URL, HTTPS.
- `RESEND_API_KEY`: production email provider key.
- `FROM_EMAIL`: verified sender.
- `CONTACT_EMAIL`: support/contact inbox.
- `CRON_SECRET`: long random value, at least 32 characters.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token for uploaded files and employee documents.

## Checks

Run locally with production-like env values:

```bash
npm run check:env
```

Production must not include:

- `PAYNEST_ALLOW_TEST_DB`
- `PAYNEST_TEST_DB_READY`
- `PAYNEST_TEST_*`
- `TEST_DATABASE_URL`
- `TEST_DIRECT_URL`
- `PLAYWRIGHT_BASE_URL`
- `.env.test` values
- test email credentials

For the full setup and post-deploy verification flow, see [vercel-production-setup.md](vercel-production-setup.md).

## After Changing Env

Redeploy the Vercel project, then verify:

- `/api/health` returns JSON.
- `/api/health?strict=1` returns 200.
- Staff login works.
- Contact form sends or safely no-ops according to email provider config.
