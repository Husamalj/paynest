# Staging Load Test Seed

Use this only against a dedicated staging PostgreSQL database. Never point it at production.

## What It Creates

- 500 fake companies by default.
- 50 to 500 fake employees per company.
- Fake owner, HR, and employee users for every company.
- Fake attendance, payroll, monthly salary, leave balance, announcement, and audit-log rows.

All seeded companies use the slug prefix `loadtest-co-`. Re-running the seed deletes and recreates only data with that prefix.

## Required Environment

```powershell
$env:STAGING_DATABASE_URL="postgresql://..."
$env:STAGING_DIRECT_URL="postgresql://..."
$env:PAYNEST_ALLOW_STAGING_LOAD_SEED="true"
```

Optional sizing:

```powershell
$env:STAGING_LOAD_COMPANIES="500"
$env:STAGING_LOAD_MIN_EMPLOYEES="50"
$env:STAGING_LOAD_MAX_EMPLOYEES="500"
$env:STAGING_LOAD_ATTENDANCE_DAYS="5"
```

## Run

```powershell
npm run staging:seed-load
```

The seed prints sample owner, HR, and employee credentials after it finishes.

## Safety Guardrails

- Refuses to run without `STAGING_DATABASE_URL`.
- Refuses to run without `PAYNEST_ALLOW_STAGING_LOAD_SEED=true`.
- Refuses to run when `VERCEL_ENV=production`.
- Does not use real names, real emails, or real customer data.
