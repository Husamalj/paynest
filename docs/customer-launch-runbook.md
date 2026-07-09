# Customer Launch Runbook

Use this before selling to, onboarding, or demoing with a real customer.

## 1. Release Gate

Every release must pass:

```bash
npm run check:ci
npm run security:audit
```

Required GitHub checks:

- `CI`: success
- Dependabot/security checks: no high unhandled findings
- Vercel deployment: ready

## 2. Staging First

Never run destructive tests or load tests on production.

Staging needs:

- separate Vercel project or Preview deployment
- separate PostgreSQL database
- fake seeded users only
- `PAYNEST_ALLOW_TEST_DB=true`
- `PAYNEST_TEST_DB_READY=true`
- `PLAYWRIGHT_BASE_URL` pointing at staging
- `K6_BASE_URL` pointing at staging

Prepare staging/test data:

```bash
npm run test:prepare
```

Run full functional flow:

```bash
npm run test:e2e:flow
```

Run RBAC and tenant isolation:

```bash
npm run test:e2e:rbac
```

## 3. Security Scan

Run OWASP ZAP only against staging/preview:

```bash
ZAP_TARGET="https://staging.example.com" npm run zap:baseline
```

Production scans require explicit approval and a quiet traffic window.

## 4. Load Test

Only run smoke/light load on production. Run normal, payroll-day, stress, and soak on staging.

```bash
K6_BASE_URL="https://staging.example.com" npm run k6:smoke
K6_BASE_URL="https://staging.example.com" npm run k6:normal
K6_BASE_URL="https://staging.example.com" npm run k6:payroll
```

Stop immediately if error rate, latency, database CPU, or Vercel function failures spike.

## 5. Backups

Production must have daily provider-level backups enabled.

Before high-risk releases:

```bash
npm run db:backup
```

If `pg_dump` is not installed locally, take a provider snapshot from Supabase/Neon dashboard.

## 6. Restore Drill

Restore drills must never target production.

1. Create an empty staging database.
2. Restore the latest backup into staging.
3. Point a staging deployment to the restored DB.
4. Run:

```bash
npm run check:isolation
npm run test:e2e:smoke
npm run test:e2e:rbac
```

Record:

- backup timestamp
- restore duration
- any failed migration
- smoke test result
- rollback notes

## 7. Health Checks

Production health endpoint:

```text
/api/health
```

Healthy minimum:

- `database: ok`
- `jwt: configured`
- `cron: configured`

`email: missing` means emails are disabled until `RESEND_API_KEY` is set.

## 8. Incident Response

When a customer reports a bug:

1. Ask for time, page, user role, company, and screenshot.
2. Check Vercel logs around that timestamp.
3. Use `requestId` from API errors if available.
4. Check DB health and recent deploy.
5. If caused by a new deploy, roll back in Vercel.
6. If data corruption is suspected, stop writes for the affected tenant and restore to staging first.

Never modify production data manually without writing down:

- exact issue
- affected company
- SQL/query used
- before/after evidence
- person approving the fix

## 9. Known Real-World Risks

Expect and handle:

- unusual Excel column names
- missing salaries or employee IDs
- duplicate employee numbers inside a company
- database connectivity problems
- Vercel or DB provider outage
- users doing workflows in unexpected order
- real data volume revealing slow queries

These are not reasons to avoid launch; they are reasons to launch with monitoring, backups, and staging discipline.
