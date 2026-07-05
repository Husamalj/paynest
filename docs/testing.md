# PayNest Testing

PayNest tests must run against fake data only. Do not point these scripts at production.

## Local Setup

1. Create a disposable PostgreSQL database named `paynest_test`.
2. Copy `.env.test.example` to `.env.test`.
3. Confirm `.env.test` points to the disposable database and has:

```env
NODE_ENV="test"
PAYNEST_ALLOW_TEST_DB="true"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/paynest_test"
TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/paynest_test"
```

4. Prepare schema and fake seed data:

```bash
npm run test:prepare
```

5. Enable database-backed E2E tests for the current shell:

```powershell
$env:PAYNEST_TEST_DB_READY="true"
```

```bash
export PAYNEST_TEST_DB_READY=true
```

## Useful Commands

```bash
npm run lint
npm run test:unit
npm run test:e2e:smoke
npm run test:e2e:auth
npm run test:e2e:api
npm run test:e2e:rbac
npm run test:e2e
```

`npm run test:all` runs the safe local baseline: lint, unit tests, and public smoke tests.

## Load And Security Tests

k6 and ZAP scripts must target staging or another non-production environment:

```bash
npm run k6:smoke
npm run k6:normal
npm run zap:baseline
```

Never run stress, soak, payroll-day, or clock-in spike load tests against production.
