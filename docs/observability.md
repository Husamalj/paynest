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

- Add Vercel log drain or Sentry before customer rollout.
- Alert on repeated `api.unhandled_error` events.
- Alert if `/api/health?strict=1` returns non-200.
- Include `requestId` when debugging customer reports.

## Sentry Option

If you enable Sentry later, keep the existing `requestId` in error responses. It gives support a stable ID even when an external monitoring provider is unavailable.
