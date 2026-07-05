# PayNest Security Test Checklist

Use only seeded test data or staging data. Never run destructive, stress, soak, or ZAP scans against production unless explicitly approved.

## Environments

- Use `.env.test` copied from `.env.test.example`.
- Confirm `DATABASE_URL` and `TEST_DATABASE_URL` point to a disposable test database.
- Confirm `NODE_ENV=test` or `PAYNEST_ALLOW_TEST_DB=true` before running seed/reset scripts.
- Confirm k6 `K6_BASE_URL` points to staging, preview, localhost, or another non-production target.

## Authentication

- Staff login rejects employee accounts on `/login`.
- Employee login rejects owner/HR/super-admin accounts on `/employee-login`.
- `/api/auth/me` returns the authenticated user.
- Missing or invalid tokens return `401`.
- Inactive or pending companies cannot log in except super admin.

## RBAC

- `super_admin` can access company/contact admin APIs.
- `owner` and `hr` can access tenant HR/payroll APIs.
- `employee` can access only self-service endpoints.
- Employees cannot access `/api/employees`, `/api/audit-log`, or `/api/payroll/calculate`.

## Tenant Isolation

- Alpha tenant users cannot see Beta tenant employees, leaves, payroll, tasks, audit logs, or messages.
- Every Prisma-backed API route is covered by `npm run check:isolation`.
- New platform-level routes must be allow-listed with a reason in `scripts/check-tenant-isolation.mjs`.

## Payroll And Attendance

- Payroll calculation handles daily, hourly, fixed, and daily-wage employees.
- Paid leave, unpaid leave, online work, and holidays are covered by unit tests.
- Payroll API rejects calculation when attendance data is missing.
- Deferred deductions are checked on payroll day.

## OWASP Baseline

- Run `npm run zap:baseline` against staging before releases.
- Review `zap-report.html`.
- Triage authentication, session, CSP, mixed-content, insecure cookie, and injection findings.

## Security Headers

- `npm run test:e2e:smoke` checks the baseline security headers on public pages.
- Production responses should include CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, COOP, CORP, and `Permissions-Policy`.
- API responses should send `Cache-Control: no-store`.

## Load Testing

- `k6:smoke` can run locally.
- `k6:normal`, `k6:employee`, `k6:clockin`, `k6:payroll`, `k6:stress`, and `k6:soak` must target staging/non-production.
- Stress and soak tests require monitoring for database pool saturation, API latency, and error rates.
