# Vercel Production Setup

Use this when preparing PayNest for a real customer-facing deployment. Do not commit real secrets.

## 1. Required Project Settings

In Vercel Project Settings > Environment Variables, add these to **Production**:

| Key | Notes |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL URL for runtime traffic. Supabase pooler usually uses port `6543` with `pgbouncer=true`. |
| `DIRECT_URL` | Direct PostgreSQL URL for Prisma operations. Usually port `5432`, no pgbouncer. |
| `JWT_SECRET` | Random secret, at least 48 characters. Changing this logs users out. |
| `NEXT_PUBLIC_APP_URL` | Public production HTTPS URL, for example `https://paynest.app`. |
| `RESEND_API_KEY` | Real Resend production key, not a test placeholder. |
| `FROM_EMAIL` | Verified sender, for example `PayNest <noreply@your-domain.com>`. |
| `CONTACT_EMAIL` | Inbox that receives website contact requests. |
| `CRON_SECRET` | Random secret, at least 32 characters, used by Vercel cron. |

Add the same keys to **Preview** with staging/preview-safe values before testing non-production deployments.

## 2. Forbidden In Production

Do not set any of these in Vercel Production:

- `PAYNEST_ALLOW_TEST_DB`
- `PAYNEST_TEST_DB_READY`
- `PAYNEST_TEST_*`
- `TEST_DATABASE_URL`
- `TEST_DIRECT_URL`
- `PLAYWRIGHT_BASE_URL`
- k6 test-user secrets

## 3. Build Settings

The repository includes `vercel.json` with:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build"
}
```

Keep Vercel using the repo build command so production builds run Prisma generation, Next build, cache cleanup, and tenant-isolation checks.

## 4. Local Verification Before Deploy

Run:

```bash
npm run check:production
```

This will fail locally until production-like environment variables are present. That is expected.

## 5. After Deploy

Verify these URLs:

```text
https://YOUR_DOMAIN/api/health
https://YOUR_DOMAIN/api/health?strict=1
```

Expected:

- `/api/health` returns JSON.
- `/api/health?strict=1` returns HTTP 200.
- Staff login works.
- Employee login works.
- Contact form sends to `CONTACT_EMAIL`.
- Daily contract reminder cron does not return 401 in Vercel logs.

## 6. Secrets Rotation

Rotate `JWT_SECRET` only when you are ready to log everyone out. Rotate `CRON_SECRET`, `RESEND_API_KEY`, and database passwords through Vercel settings, then redeploy and check `/api/health?strict=1`.
