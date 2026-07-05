# Production Checklist

Use this checklist before deploying PayNest or changing production settings.

## Required Environment Variables

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
- Do not set `PAYNEST_ALLOW_TEST_DB=true` in production.
- Do not run `npm run test:prepare`, `npm run test:seed`, `npm run test:seed:users`, or `npm run test:reset` against production.

## Pre-Deploy Checks

```bash
npm run lint
npm run check:isolation
npm run test:unit
npm run build
```

For staging releases, also run:

```bash
npm run test:e2e:smoke
npm run zap:baseline
```

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

