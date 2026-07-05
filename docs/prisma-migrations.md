# Prisma Migrations

Use migrations for production schema changes. Avoid ad-hoc `prisma db push` against production.

## Development

For local development:

```bash
npx prisma migrate dev --name describe_change
```

This creates a migration under `prisma/migrations/`.

## Production

In production deploys, use:

```bash
npx prisma migrate deploy
```

Do not run destructive migration commands against production without a fresh backup. See `docs/database-backup.md`.

## Test Database

`npm run test:prepare` can use `prisma db push` because it targets a disposable local test database only.
