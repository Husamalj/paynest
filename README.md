# PayNest

PayNest is a multi-tenant HR and payroll SaaS built with Next.js, Prisma, PostgreSQL, Playwright, Vitest, and k6.

## Stack

- Next.js App Router
- API routes in `app/api`
- React
- Prisma ORM
- PostgreSQL
- JWT cookie authentication
- Playwright E2E tests
- Vitest unit tests
- k6 load tests

## Core Roles

- `super_admin`: platform dashboard, company approvals, company controls, contact requests.
- `owner`: company owner portal and tenant management.
- `hr`: HR/payroll dashboard for one company.
- `employee`: employee self-service portal.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment variables:

```bash
cp .env.test.example .env.test
```

For normal development, create `.env.local` with at least:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
FROM_EMAIL="noreply@example.test"
RESEND_API_KEY="test-resend-disabled"
CONTACT_EMAIL="support@example.test"
```

3. Generate Prisma client and push schema:

```bash
npx prisma generate
npx prisma db push
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run lint
npm run build
npm run check:ci
npm run check:production
npm run check:isolation
npm run test:unit
npm run test:e2e:smoke
npm run test:all
```

Database-backed auth/API/RBAC tests need a disposable local PostgreSQL test database. See [docs/testing.md](docs/testing.md).

GitHub Actions runs lint, TypeScript, unit tests, smoke/auth/API/RBAC E2E tests, tenant isolation, and production build on pushes and pull requests. Run `npm run check:ci` locally before pushing when you want the same core code checks without starting Playwright.

## Deployment

Production deploys should use managed PostgreSQL and production-only secrets. Before deploying, run:

```bash
npm run check:production
```

Use [docs/production-checklist.md](docs/production-checklist.md) before changing production environment variables or database settings.
Use [.env.production.example](.env.production.example) as the Vercel variable checklist without committing real values.
Use [docs/database-backup.md](docs/database-backup.md) for backup and restore procedures.
Use [docs/observability.md](docs/observability.md) for logs, request IDs, and health checks.
Use [docs/prisma-migrations.md](docs/prisma-migrations.md) for production schema change rules.
Use [docs/storage-review.md](docs/storage-review.md) before expanding upload/document features.
Use [docs/dependency-security.md](docs/dependency-security.md) for dependency audits and known package-risk decisions.
Use [docs/vercel-env.md](docs/vercel-env.md) when editing Vercel environment variables.
Use [docs/vercel-production-setup.md](docs/vercel-production-setup.md) for the full Vercel production setup checklist.
Use [docs/customer-readiness-roadmap.md](docs/customer-readiness-roadmap.md) for storage, billing, support, and rollout decisions that require external services.

The legacy `frontend/` and `backend/` folders were removed after migration. The Next.js app at the repository root is the single source of truth.

Presentation and pricing deck assets live under `docs/assets/presentations/`; their generation scripts live under `scripts/presentations/`.

## Security Notes

- Never commit `.env`, `.env.local`, `.env.production`, or real credentials.
- Never run seed/reset scripts against production.
- Never run k6 stress, soak, payroll-day, or clock-in spike tests against production.
- Keep tenant-scoped API routes covered by `npm run check:isolation`.
