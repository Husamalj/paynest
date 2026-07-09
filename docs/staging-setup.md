# Staging Setup

Use staging for full-flow, ZAP, k6, backup restore drills, and customer-risky validation.

## Required Staging Infrastructure

- Dedicated Vercel project or Preview deployment.
- Dedicated PostgreSQL database.
- Fake seeded data only.
- No production customer data.

## Required GitHub Secrets

For `.github/workflows/staging-full-flow.yml`:

- `STAGING_DATABASE_URL`
- `STAGING_DIRECT_URL`
- `STAGING_JWT_SECRET`

For k6 workflow:

- `K6_EMPLOYEE_EMAIL`
- `K6_EMPLOYEE_PASSWORD`
- `K6_OWNER_EMAIL`
- `K6_OWNER_PASSWORD`

## Required Vercel Staging Environment Variables

Use `.env.staging.example` as the source checklist.

Minimum:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
- `FROM_EMAIL`
- `CONTACT_EMAIL`
- `RESEND_API_KEY` if email delivery should be tested

## Bring Staging Up

1. Create a staging database.
2. Configure Vercel staging env vars.
3. Deploy staging.
4. Seed fake demo data:

```bash
PAYNEST_ALLOW_DEMO_SEED=true PAYNEST_DEMO_PASSWORD="replace-with-strong-password" npm run demo:seed
```

5. Run the full flow:

```bash
PAYNEST_TEST_DB_READY=true PLAYWRIGHT_BASE_URL="https://staging.example.com" PLAYWRIGHT_SKIP_WEB_SERVER=true npm run test:e2e:flow
```

## Run Security ZAP

Use the GitHub `Security ZAP` workflow with the staging URL.

Do not enable `allow_production` except for an approved production scan window.

## Run k6

Use the GitHub `Load k6` workflow with the staging URL.

Recommended order:

1. smoke
2. normal
3. employee
4. clockin
5. payroll
6. stress
7. soak

Stop if error rate or latency spikes.

