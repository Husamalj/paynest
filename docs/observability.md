# Observability

PayNest now has structured server-side error logging through `lib/logger.ts`.

## Request IDs

Unexpected API failures return a `requestId` in the JSON response and the `x-request-id` header. Use that value to search logs in Vercel.

Example response:

```json
{
  "error": "Internal server error",
  "requestId": "..."
}
```

## Health Checks

Use:

```text
/api/health
```

for uptime checks. It always returns a JSON payload with component checks.

Use:

```text
/api/health?strict=1
```

for strict monitoring. It returns `503` when database or critical configuration checks are degraded.

## Recommended Production Monitoring

- GitHub Actions runs `.github/workflows/uptime-health.yml` every 10 minutes against:

```text
https://www.paynest.app/api/health?strict=1
```

  It can also be run manually from GitHub Actions by opening **Uptime Health** and clicking **Run workflow**.
- Add Vercel log drain or Sentry before customer rollout.
- Alert on repeated `api.unhandled_error` events.
- Alert if `/api/health?strict=1` returns non-200.
- Run uptime checks from an external service, not only from your own machine.
- Watch database connection pool saturation and slow queries.
- Watch email delivery failures for reset-password, verification, and contact form emails.
- Include `requestId` when debugging customer reports.

## External Uptime Services

For UptimeRobot, Better Stack, or any other external monitor, create an HTTPS monitor with:

```text
URL: https://www.paynest.app/api/health?strict=1
Expected status: 200
Interval: 1-5 minutes
Method: GET
Alert on: non-200 response, timeout, or SSL failure
```

Use the GitHub Actions monitor as the free built-in safety net, and add UptimeRobot or Better Stack when the production alert contacts are ready.

## Sentry Option

If you enable Sentry later, keep the existing `requestId` in error responses. It gives support a stable ID even when an external monitoring provider is unavailable. Store `SENTRY_DSN` in Vercel environment variables, not in git.
