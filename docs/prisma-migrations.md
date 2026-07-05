# Prisma Migrations

Use migrations for production schema changes. Avoid ad-hoc `prisma db push` against production.

## Development

For local development:

```bash
npx prisma migrate dev --name describe_change
```

This creates a migration under `prisma/migrations/`.

Equivalent npm command:

```bash
npm run db:migrate:dev -- --name describe_change
```

## Production

In production deploys, use:

```bash
npx prisma migrate deploy
```

Equivalent npm command:

```bash
npm run db:migrate:deploy
```

Do not run destructive migration commands against production without a fresh backup. See `docs/database-backup.md`.

## Current State

This project does not yet have a committed `prisma/migrations/` history. Do not switch Vercel's build command to `prisma migrate deploy` until the first baseline migration is created and verified on staging.

## Test Database

`npm run test:prepare` can use `prisma db push` because it targets a disposable local test database only.
