# PayNest

PayNest is a multi-tenant HR and payroll SaaS built with Next.js, Prisma, PostgreSQL, Playwright, Vitest, and k6.

## Stack

- Next.js App Router
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
npm run check:isolation
npm run test:unit
npm run test:e2e:smoke
npm run test:all
```

Database-backed auth/API/RBAC tests need a disposable local PostgreSQL test database. See [docs/testing.md](docs/testing.md).

## Deployment

Production deploys should use managed PostgreSQL and production-only secrets. Before deploying, run:

```bash
npm run lint
npm run check:env
npm run check:isolation
npm run test:unit
npm run build
```

Use [docs/production-checklist.md](docs/production-checklist.md) before changing production environment variables or database settings.
Use [.env.production.example](.env.production.example) as the Vercel variable checklist without committing real values.

## Security Notes

- Never commit `.env`, `.env.local`, `.env.production`, or real credentials.
- Never run seed/reset scripts against production.
- Never run k6 stress, soak, payroll-day, or clock-in spike tests against production.
- Keep tenant-scoped API routes covered by `npm run check:isolation`.
