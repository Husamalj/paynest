# Optional Production Integrations Health Design

## Goal

Keep GitHub uptime monitoring focused on whether the core PayNest application can serve authenticated, database-backed requests while email, scheduled jobs, and external file storage are intentionally unavailable.

## Health Policy

The strict health endpoint continues to return the status of five capabilities:

- Database: required. A failed query makes the service degraded.
- JWT: required. A missing `JWT_SECRET` makes the service degraded.
- Email: optional. Missing Resend configuration is reported as `disabled` and does not degrade the service.
- Cron: optional. Missing `CRON_SECRET` is reported as `disabled` and does not degrade the service.
- Storage: optional. Missing Vercel Blob configuration is reported as `database-fallback` and does not degrade the service.

The endpoint returns HTTP 200 with `status: "ok"` when database and JWT checks pass. It returns HTTP 503 in strict mode when either required check fails.

## Email Behavior

Email delivery remains a safe no-op when `RESEND_API_KEY` is absent. User actions such as registration, password-reset requests, leave decisions, payroll runs, and employee creation continue without sending email. Existing database and application behavior is otherwise unchanged.

## Implementation

Extract the health-status decision into a small pure helper so it can be tested without a database or HTTP server. The route will build capability statuses, use the helper to determine the overall status, and retain the existing response shape.

Update production documentation and environment validation so email, cron, and Blob variables are documented and validated only when configured, rather than treated as mandatory deployment blockers.

## Tests

Add unit tests proving:

1. Core health is OK when database and JWT pass while optional integrations are disabled or using fallback storage.
2. A database failure degrades health.
3. A missing JWT secret degrades health.
4. Configured optional integrations remain visible without changing core health.

Run the complete unit suite and a production build before committing the implementation to `main`.

## Operational Follow-up

No Vercel variables are required to keep the uptime workflow green beyond the existing working database and `JWT_SECRET`. Later, enabling a capability requires adding its real production variable and redeploying:

- Email: `RESEND_API_KEY` and `FROM_EMAIL`
- Cron security: `CRON_SECRET`
- Vercel Blob storage: `BLOB_READ_WRITE_TOKEN`
