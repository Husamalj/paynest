# Production Checklist

Use this checklist before deploying PayNest or changing production settings.

## Required Environment Variables

Use `.env.production.example` as the checklist for Vercel. Add the real values in Vercel Project Settings > Environment Variables, not in git.
For the full Vercel setup flow, use [vercel-production-setup.md](vercel-production-setup.md).

- `DATABASE_URL`: production PostgreSQL pooled connection string.
- `DIRECT_URL`: direct PostgreSQL connection string for Prisma operations.
- `JWT_SECRET`: long random secret, different from test/dev.
- `NEXT_PUBLIC_APP_URL`: production app URL.
- `FROM_EMAIL`: verified sender address.
- `RESEND_API_KEY`: production email provider key.
- `CONTACT_EMAIL`: inbox for contact form submissions.
- `CRON_SECRET`: secret for protected cron routes.

## Database Safety

- Confirm production database is backed up before schema changes.
- Run migrations or Prisma schema changes on staging first.
- Use `npx prisma migrate deploy` for production migrations.
- Do not set `PAYNEST_ALLOW_TEST_DB=true` in production.
- Do not run `npm run test:prepare`, `npm run test:seed`, `npm run test:seed:users`, or `npm run test:reset` against production.

## Pre-Deploy Checks

```bash
npm run check:ci
npm run check:production
npm run security:audit
```

Review [dependency-security.md](dependency-security.md) if any dependency finding appears.

For staging releases, also run:

```bash
npm run test:e2e:smoke
npm run zap:baseline
```

You can also run the GitHub Actions `Security ZAP` workflow manually against a Vercel preview or staging URL and download the `zap-baseline-report` artifact.
For performance checks, run the GitHub Actions `Load k6` workflow against staging or preview. Use `smoke` for every release candidate, and reserve `stress`/`soak` for monitored staging windows.

## Tenant And RBAC Checks

- New API routes must verify authentication before returning tenant data.
- Tenant data queries must include `companyId` unless the route is platform-level.
- Platform-level routes must be intentionally allow-listed in `scripts/check-tenant-isolation.mjs`.
- Employee routes must only expose self-service data.

## After Deploy

- Log in as super admin, owner/HR, and employee.
- Confirm company page hiding still blocks hidden UI and hidden API routes.
- Confirm contact form delivery.
- Confirm login/logout cookies work over HTTPS.
- Check server logs for Prisma, auth, or email errors.
