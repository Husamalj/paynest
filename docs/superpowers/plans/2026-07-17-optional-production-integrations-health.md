# Optional Production Integrations Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GitHub uptime monitoring depend only on database and JWT health while keeping email, cron, and Blob storage optional and observable.

**Architecture:** Add a pure health-policy helper consumed by the health route, allowing unit tests without database or HTTP mocks. Keep the existing response fields, express missing optional integrations as disabled/fallback states, and align production validation and documentation with the runtime policy.

**Tech Stack:** TypeScript, Next.js App Router, Vitest, Node.js environment validation, GitHub Actions.

## Global Constraints

- Database connectivity and `JWT_SECRET` remain required.
- Email, cron security, and Vercel Blob storage remain optional.
- Missing Resend configuration keeps all email calls as safe no-ops.
- The strict endpoint returns HTTP 503 only when a required check fails.

---

### Task 1: Test and implement the health policy

**Files:**
- Create: `lib/health.ts`
- Create: `tests/unit/health.test.ts`
- Modify: `app/api/health/route.ts`

**Interfaces:**
- Produces: `type HealthChecks` and `evaluateHealth(checks: HealthChecks): "ok" | "degraded"`.
- Consumes: capability status strings created by the health route.

- [ ] **Step 1: Write the failing unit tests**

Test that `{ database: "ok", jwt: "configured", email: "disabled", cron: "disabled", storage: "database-fallback" }` returns `"ok"`, while database `"error"` or JWT `"missing"` returns `"degraded"`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run tests/unit/health.test.ts`

Expected: FAIL because `@/lib/health` does not exist.

- [ ] **Step 3: Add the minimal pure policy helper**

```ts
export type HealthChecks = {
  database: string;
  jwt: string;
  email: string;
  cron: string;
  storage: string;
};

export function evaluateHealth(checks: HealthChecks) {
  return checks.database === "ok" && checks.jwt === "configured" ? "ok" : "degraded";
}
```

- [ ] **Step 4: Use the helper in the route**

Report absent email and cron configuration as `"disabled"`; keep storage as `"database-fallback"`; calculate overall status through `evaluateHealth`; return 503 in strict mode only for `"degraded"`.

- [ ] **Step 5: Run focused and complete unit tests**

Run: `npx vitest run tests/unit/health.test.ts` and `npm run test:unit`.

Expected: focused tests pass; complete unit suite has zero failures.

### Task 2: Align production validation and documentation

**Files:**
- Modify: `scripts/check-production-env.mjs`
- Modify: `docs/vercel-env.md`
- Modify: `docs/production-checklist.md`
- Modify: `docs/observability.md`
- Modify: `docs/support-runbook.md`
- Modify: `docs/resend-email-setup.md`
- Modify: `.env.production.example`

**Interfaces:**
- Consumes: the optional-integration policy from Task 1.
- Produces: production validation that requires only core variables and validates optional values when present.

- [ ] **Step 1: Split core and optional environment keys**

Require `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, and `NEXT_PUBLIC_APP_URL`. Do not require `RESEND_API_KEY`, `FROM_EMAIL`, `CONTACT_EMAIL`, `CRON_SECRET`, or `BLOB_READ_WRITE_TOKEN`; retain their format, strength, and placeholder checks when supplied.

- [ ] **Step 2: Update examples and operational documentation**

Label Resend, cron, and Blob variables as optional capabilities and document their disabled/fallback behavior. Keep placeholders in `.env.production.example` commented so copying the file does not imply they are required.

- [ ] **Step 3: Validate the production checker without optional integrations**

Run the checker with safe production-like core values and no optional integration variables.

Expected: `PayNest production environment check passed.`

### Task 3: Full verification and delivery

**Files:**
- Verify all files changed in Tasks 1 and 2.

**Interfaces:**
- Consumes: completed implementation and documentation.
- Produces: verified commit on `main` and a successful push to `origin/main`.

- [ ] **Step 1: Run verification**

Run: `npm run test:unit`, `npm run build`, and `git diff --check`.

Expected: all commands exit zero.

- [ ] **Step 2: Commit implementation**

Stage only the planned files and commit with `Make optional integrations non-blocking for health`.

- [ ] **Step 3: Push and verify remote main**

Push `main` to `origin`, then verify `git ls-remote origin refs/heads/main` matches local `HEAD`.

- [ ] **Step 4: Verify production after Vercel redeploys**

Request `https://paynest-two.vercel.app/api/health?strict=1` and confirm HTTP 200 with database `ok`, JWT `configured`, email/cron `disabled` when unset, and storage `database-fallback` when Blob is unset.
