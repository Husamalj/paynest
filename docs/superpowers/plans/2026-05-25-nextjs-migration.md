# PayNest → Next.js + Prisma + Supabase Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## Read this first — context for the AI assistant executing this plan

You are being handed this plan cold. The original author is not in this conversation. Before you start, understand the following:

**What PayNest is today (the current production system):**
- Multi-tenant HR + Payroll SaaS for small companies in Jordan. Bilingual Arabic/English (RTL/LTR). Live at https://paynest.vercel.app (frontend) talking to https://paynest-2s5b.onrender.com (backend).
- Frontend: React 18 + Vite + Tailwind, deployed on Vercel from this repo's `frontend/` directory.
- Backend: Node.js + Express, deployed on Render free tier from this repo's `backend/` directory. **Sleeps after 15 min of idle → ~50s cold-start → user pain.** This is the main reason we're migrating.
- Database: PostgreSQL on Render (external hostname looks like `dpg-d8a6r88js32c739qcas0-a.oregon-postgres.render.com`). Accessed via the raw `pg` driver. Schema is created/altered at server boot by `backend/src/db/migrations.js`.
- Auth: JWT (`jsonwebtoken`), 7-day expiry, header `Authorization: Bearer <token>`. Roles: `super_admin`, `owner`, `hr`, `employee`.
- Tenancy: every table has a `company_id` column. Every API route filters by `req.user.companyId` from the JWT. The `super_admin` role is global (no `company_id`).
- Repo layout TODAY:
  ```
  paynest/
  ├── frontend/   (Vite app, deployed to Vercel)
  ├── backend/    (Express app, deployed to Render)
  ├── mobile/     (Expo app — unrelated to this migration, leave alone)
  ├── desktop/    (Electron app — unrelated, leave alone)
  └── docs/       (this plan lives here)
  ```

**What this plan does:**
- Builds a new Next.js 16 + TypeScript + Prisma + Supabase app at the **repo root** on a parallel branch (`next-migration`), feature-parity with the current system.
- When parity is verified on a Vercel preview deployment, the new branch is merged to `main`, Vercel automatically promotes it to production, and the old Render backend + Render Postgres are decommissioned.
- The `frontend/` and `backend/` directories are deleted in the final task. `mobile/` and `desktop/` are NOT touched.

**Things you (the AI) MUST do, not assume:**
- **Never invent secrets.** Whenever the plan asks for a `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `RENDER_DATABASE_URL`, Vercel project name, or any other credential, STOP and ask the human operator for it. Do not put placeholder values into `.env.local` and hope it works. Do not generate a JWT secret without asking — if they have an existing one in Render env vars, reuse it so existing tokens don't get invalidated (ask them).
- **Never run Task 13 (data migration) before Tasks 1–12 are complete and verified on a preview deployment.** Running it early will wipe Supabase and break dev for everyone.
- **Never run destructive Step 5/6 of Task 14 (delete Render service, delete legacy directories) without explicit human approval in the chat for that specific action.** Even if the human said "execute the whole plan", confirm again before each destructive operation.
- **Commit after every task or sub-slice as the plan specifies.** Do not batch many tasks into one mega-commit. The plan's commit boundaries are the rollback points.
- **Use the user's actual repo path.** The plan uses repo-relative paths like `frontend/src/...` everywhere. Run all shell commands from the repo root. Detect the operating system from the environment and use the matching shell (PowerShell on Windows, bash on macOS/Linux). The example commands below are written as POSIX bash; on PowerShell, translate them (e.g., `cp` → `Copy-Item`, `&&` → `; if ($?) {...}`, env vars → `$env:NAME`).
- **Two-person workflow.** A coworker is implementing this; the original author is not always available. If a step is ambiguous, ask the coworker — don't escalate to "the original author" who isn't here.

**What you can assume:**
- Node 20+ and npm are installed.
- The coworker has push access to the GitHub repo `Husamalj/paynest` (or whatever the actual remote is — verify with `git remote -v`).
- The coworker has — or can create — a Supabase account and a Vercel account.
- The legacy production system stays live and untouched until Task 14 cutover.

---

**Goal:** Migrate PayNest from React+Vite + Express + Render Postgres to a single Next.js 16 (App Router) + TypeScript + Prisma + Supabase Postgres app deployed on Vercel — same stack as the original author's HiredJo project — to eliminate cold-start sleeping, simplify deployment, and unify frontend/backend in one repo.

**Architecture:**
- One Next.js app replaces both the `frontend/` (Vite) and `backend/` (Express) folders. Pages live in `app/(routes)/...`, APIs in `app/api/.../route.ts`.
- Prisma is the only DB layer (replaces the raw `pg` pool + the hand-rolled migrations file). Supabase hosts the Postgres database (free tier, no sleeping).
- Auth stays JWT-based on first pass (port the existing `jsonwebtoken` middleware to a Next.js helper) so we don't conflate "migration" with "redo auth". NextAuth/Supabase Auth is a follow-up, not part of this plan.
- Multi-tenant isolation pattern is preserved exactly: every table keeps `company_id`, every API route reads `req.user.companyId` from the JWT and filters on it.
- Deployment is a single `vercel deploy` of the repo root. No separate Render service. The old Render service is decommissioned at the end.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 5, Supabase Postgres, Tailwind CSS, bcryptjs, jsonwebtoken, jose (for edge-safe JWT verify), react-router-dom is REMOVED (App Router replaces it), Vercel.

**Migration strategy:** Big-bang on a parallel branch (`next-migration`). The old `master` branch keeps serving production traffic on Vercel+Render until the new branch is feature-parity and the user flips the Vercel project's production branch. No interleaved hybrid — too many moving parts.

---

## File Structure (target)

```
paynest/                                # repo root becomes the Next.js app
├── app/
│   ├── layout.tsx                      # root layout, wraps with LanguageProvider
│   ├── page.tsx                        # landing (HR + Employee portal cards)
│   ├── globals.css                     # ports frontend/src/index.css
│   ├── (auth)/
│   │   ├── hr-login/page.tsx
│   │   ├── employee-login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/                          # protected routes
│   │   ├── layout.tsx                  # AuthGate + sidebar (ports Layout.jsx)
│   │   ├── dashboard/page.tsx
│   │   ├── employees/page.tsx
│   │   ├── payroll/page.tsx
│   │   ├── bonuses/page.tsx
│   │   ├── leaves/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── remote/page.tsx
│   │   ├── announcements/page.tsx
│   │   ├── upload/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── system-select/page.tsx
│   │   ├── owner-setup/page.tsx
│   │   ├── employee-portal/page.tsx
│   │   └── super-admin/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register-company/route.ts
│       │   ├── me/route.ts
│       │   └── change-password/route.ts
│       ├── companies/route.ts
│       ├── companies/[id]/route.ts
│       ├── companies/[id]/approve/route.ts
│       ├── companies/[id]/reject/route.ts
│       ├── settings/route.ts
│       ├── employees/route.ts
│       ├── employees/[id]/route.ts
│       ├── payroll/route.ts
│       ├── payroll/calculate/route.ts
│       ├── bonuses/route.ts
│       ├── bonuses/[id]/route.ts
│       ├── leaves/route.ts
│       ├── leaves/[id]/route.ts
│       ├── leaves/balances/route.ts
│       ├── tasks/route.ts
│       ├── tasks/[id]/route.ts
│       ├── remote-assignments/route.ts
│       ├── remote-assignments/[id]/route.ts
│       ├── announcements/route.ts
│       ├── announcements/[id]/route.ts
│       ├── upload/route.ts
│       ├── copilot/route.ts
│       └── health/route.ts
├── components/                         # ports frontend/src/components
│   ├── Layout.tsx
│   ├── StatCard.tsx
│   ├── LangToggle.tsx
│   └── AuthGate.tsx
├── lib/
│   ├── prisma.ts                       # Prisma client singleton
│   ├── auth.ts                         # signJwt / verifyJwt / requireAuth / requireRole
│   ├── api.ts                          # client-side fetch helper (replaces utils/api.js)
│   └── i18n/
│       ├── LanguageContext.tsx
│       ├── useLanguage.ts
│       └── translations.ts
├── prisma/
│   ├── schema.prisma                   # all 14 tables modelled here
│   ├── migrations/                     # generated by `prisma migrate`
│   └── seed.ts                         # super_admin seed
├── scripts/
│   └── migrate-data-from-render.ts     # one-shot data export+import
├── public/
├── middleware.ts                       # JWT gate for /api/* (except /api/auth/*)
├── next.config.ts
├── tailwind.config.ts                  # ports current tailwind config including shadow tokens
├── tsconfig.json
├── package.json
├── .env.example
├── .env.local                          # gitignored
└── README.md
```

The old `frontend/` and `backend/` directories are deleted in the final task. Everything else outside of those directories (`docs/`, `mobile/`, `desktop/`, etc.) stays untouched.

---

## Pre-flight (human operator does these — not the AI)

These are manual actions the coworker performs in browser dashboards and their local terminal. The AI assistant should NOT run these; instead, it should ask the human to confirm each one is done before starting Task 1.

**AI: when you reach this section, post a checklist to the chat asking the human to confirm each item below is complete, and to paste the resulting values into the chat (or into `.env.local` themselves — see Task 1 Step 4 for the file shape). Do not proceed to Task 1 until they confirm.**

1. **Create the Supabase project.** Go to https://supabase.com → New Project → name `paynest` (or `paynest-prod` if that's taken), region `eu-central-1` (Frankfurt, closest to Jordan). Set a strong DB password and SAVE IT (you'll need it for env vars). Wait ~2 min for provisioning.

2. **Grab the two connection strings.** In Supabase dashboard → Project Settings → Database → "Connection string" section:
   - **Transaction pooler** URL (port `6543`) → this is `DATABASE_URL` (used by app at runtime).
   - **Direct connection** URL (port `5432`) → this is `DIRECT_URL` (used by Prisma migrations only).
   - Both URLs will already contain the DB password you just set.

3. **Decide on the JWT secret.**
   - If you want existing user tokens from the live production app to keep working after cutover, reuse the JWT secret that's currently set in Render → paynest backend → Environment → `JWT_SECRET`. Copy it out of Render.
   - If you're fine forcing everyone to log in again after cutover, generate a new one:
     - macOS/Linux: `openssl rand -base64 48`
     - Windows PowerShell: `[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))`
   - Either way, this value becomes `JWT_SECRET`.

4. **Get the legacy Render Postgres URL** (needed in Task 13, not Task 1, but get it now so you don't have to context-switch later). Render dashboard → paynest Postgres database → "External Database URL". This becomes `RENDER_DATABASE_URL` later.

5. **Confirm the Vercel project exists and points at this repo.** Vercel dashboard → check that there's a project linked to the `Husamalj/paynest` GitHub repo (or whatever the actual remote is — confirm with `git remote -v` in the repo). If not, create one but **do not change the production branch yet** — leave it at `main` so live traffic keeps hitting the current production build until cutover (Task 14).

6. **Tell the AI assistant when all 5 items above are done**, and paste these values in the chat (the AI will write them into `.env.local`, which is gitignored):
   - `DATABASE_URL=...`
   - `DIRECT_URL=...`
   - `JWT_SECRET=...`
   - `RENDER_DATABASE_URL=...` (for Task 13)
   - The Vercel project name/slug

**AI: never invent these values. If the human hasn't given them to you, stop and ask. Never commit `.env.local` (it should already be in `.gitignore` — verify before Task 1 Step 5).**

---

### Task 1: Bootstrap the Next.js app on a clean branch

**Files:**
- Create: `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `package.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.env.example`, `.gitignore` (additions), `README.md` (additions)

- [ ] **Step 1: Verify the working tree is clean and create the migration branch**

```bash
git status                     # must show "nothing to commit, working tree clean"
git fetch origin
git checkout main              # the default branch — if your repo uses 'master', use that instead
git pull
git checkout -b next-migration
```

If `git status` shows uncommitted changes, STOP and ask the human what to do (do not stash or discard without asking).

- [ ] **Step 2: Initialize Next.js in the repo root**

Run from the repo root (wherever you cloned `paynest`):

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm
```

When the installer prompts to overwrite existing files:
- `.gitignore` → **No** (we want to keep the existing one which excludes `mobile/`, `desktop/`, etc.; the installer's additions for Next/Vercel will be added by hand in a later step)
- `README.md` → **No** (keep existing)
- `package.json` → **No** if one exists at root (none should — the existing `package.json` files are inside `frontend/` and `backend/`); if the installer reports no conflict, accept its file
- Everything else → **Yes**

After install, append the Next.js-relevant ignore lines to `.gitignore` (only the ones not already present): `.next/`, `next-env.d.ts`, `.env*.local`, `.vercel`.

- [ ] **Step 3: Add runtime dependencies**

```bash
npm install @prisma/client bcryptjs jsonwebtoken jose lucide-react xlsx zod
npm install -D prisma @types/bcryptjs @types/jsonwebtoken tsx
```

- [ ] **Step 4: Write `.env.example`**

```bash
# Supabase Postgres (pooler — use for runtime)
DATABASE_URL="postgresql://postgres.<project>:<password>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Supabase Postgres (direct — use for migrations only)
DIRECT_URL="postgresql://postgres.<project>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Auth
JWT_SECRET="replace-with-output-of-openssl-rand-base64-48"

# Public site URL (no trailing slash) — used by client for absolute links if needed
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

- [ ] **Step 5: Copy the env file locally and fill real values**

```bash
cp .env.example .env.local
# then edit .env.local with the real Supabase URLs and JWT_SECRET
```

- [ ] **Step 6: Verify dev server boots**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000 with the default Next.js page. Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: bootstrap Next.js 16 app on next-migration branch"
```

---

### Task 2: Port Tailwind theme and global styles

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`
- Read: `frontend/tailwind.config.js`, `frontend/src/index.css`

- [ ] **Step 1: Open the existing config and CSS for reference**

Read `frontend/tailwind.config.js` and `frontend/src/index.css` into your editor. Note the custom shadow tokens (`btn-hover`, `btn-primary-hover`, `card-hover`, etc.) and the `.btn`, `.card`, `.card-interactive` utility classes.

- [ ] **Step 2: Rewrite `tailwind.config.ts` with TypeScript types and the same theme**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // copy the brand palette verbatim from frontend/tailwind.config.js
        brand: { /* paste from old config */ },
      },
      boxShadow: {
        "btn-hover": "0 4px 12px -2px rgba(15, 23, 42, 0.12), 0 2px 4px -1px rgba(15, 23, 42, 0.08)",
        "btn-primary-hover": "0 4px 14px -2px rgba(0, 111, 198, 0.35)",
        "btn-success-hover": "0 4px 14px -2px rgba(5, 150, 105, 0.35)",
        "btn-danger-hover": "0 4px 14px -2px rgba(225, 29, 72, 0.35)",
        "card-hover": "0 8px 24px -4px rgba(15, 23, 42, 0.10), 0 4px 8px -2px rgba(15, 23, 42, 0.06)",
      },
      fontFamily: {
        // copy from old config
      },
    },
  },
  plugins: [],
};
export default config;
```

Fill the `colors.brand` and `fontFamily` blocks by copy-pasting from `frontend/tailwind.config.js`.

- [ ] **Step 3: Replace `app/globals.css` with the existing index.css contents**

Copy the entire body of `frontend/src/index.css` into `app/globals.css`. Keep the `@tailwind base; @tailwind components; @tailwind utilities;` directives at the top (replace with the v4 `@import "tailwindcss";` form if create-next-app installed Tailwind v4).

- [ ] **Step 4: Boot dev server and confirm styles compile**

```bash
npm run dev
```

Visit http://localhost:3000 — the default page should render with no console errors. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts app/globals.css postcss.config.* package.json package-lock.json
git commit -m "style: port Tailwind theme and global styles from Vite app"
```

---

### Task 3: Define Prisma schema mirroring the existing Postgres tables

**Files:**
- Create: `prisma/schema.prisma`
- Read: `backend/src/db/migrations.js` (source of truth for tables/columns)

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma`. Overwrite the generated file with the schema below.

- [ ] **Step 2: Write `prisma/schema.prisma`**

This schema mirrors every CREATE TABLE and ALTER TABLE in `backend/src/db/migrations.js`. Field names use Prisma camelCase with `@map` to the original snake_case column names. Table names use `@@map` to the original plural snake_case.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Company {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(255)
  slug      String   @unique @db.VarChar(100)
  status    String   @default("active") @db.VarChar(20)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  users               User[]
  employees           Employee[]
  settings            CompanySettings[]
  attendanceRecords   AttendanceRecord[]
  payrollRecords      PayrollRecord[]
  bonusesDeductions   BonusDeduction[]
  uploadedFiles       UploadedFile[]
  leaveRequests       LeaveRequest[]
  leaveBalances       LeaveBalance[]
  officialHolidays    OfficialHoliday[]
  tasks               Task[]
  remoteAssignments   RemoteAssignment[]
  announcements       Announcement[]

  @@map("companies")
}

model User {
  id                  Int      @id @default(autoincrement())
  name                String   @db.VarChar(255)
  employeeNumber      String?  @map("employee_number") @db.VarChar(50)
  email               String?  @db.VarChar(255)
  password            String   @db.VarChar(255)
  role                String   @db.VarChar(20)   // super_admin | owner | hr | employee
  isActive            Boolean  @default(true)    @map("is_active")
  mustChangePassword  Boolean  @default(false)   @map("must_change_password")
  companyId           Int?     @map("company_id")
  createdAt           DateTime @default(now())   @map("created_at")

  company Company? @relation(fields: [companyId], references: [id])

  @@map("users")
}

model CompanySettings {
  id              Int      @id @default(autoincrement())
  companyId       Int      @default(1)    @map("company_id")
  companyName     String   @default("PayNest") @map("company_name") @db.VarChar(255)
  systemMode      String   @default("daily")   @map("system_mode")  @db.VarChar(20)
  language        String   @default("ar") @db.VarChar(10)
  reqHours        Decimal  @default(8)   @map("req_hours")
  monthDays       Int      @default(26)  @map("month_days")
  lateTolerance   Int      @default(0)   @map("late_tolerance")
  workdays        String   @default("Sun,Mon,Tue,Wed,Thu") @db.VarChar(50)
  deductionRate   Decimal  @default(1.0) @map("deduction_rate")
  extraRate       Decimal  @default(1.0) @map("extra_rate")
  createdAt       DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("company_settings")
}

model Employee {
  id              Int      @id @default(autoincrement())
  companyId       Int      @default(1) @map("company_id")
  employeeId      String?  @map("employee_id") @db.VarChar(50)
  name            String   @db.VarChar(255)
  email           String   @default("") @db.VarChar(255)
  religion        String   @default("") @db.VarChar(50)
  baseSalary      Decimal  @default(0) @map("base_salary")
  socialSecurity  Boolean  @default(false) @map("social_security")
  remoteDays      Int      @default(0) @map("remote_days")
  systemMode      String   @default("daily") @map("system_mode") @db.VarChar(20)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @default(now()) @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id])

  @@unique([employeeId, systemMode], map: "employees_emp_mode_uidx")
  @@map("employees")
}

model AttendanceRecord {
  id           Int      @id @default(autoincrement())
  companyId    Int      @default(1) @map("company_id")
  employeeId   String?  @map("employee_id") @db.VarChar(50)
  workDate     DateTime? @map("work_date") @db.Date
  clockIn      DateTime? @map("clock_in") @db.Time
  clockOut     DateTime? @map("clock_out") @db.Time
  hoursWorked  Decimal  @default(0) @map("hours_worked")
  uploadBatch  String?  @map("upload_batch") @db.VarChar(100)
  systemMode   String   @default("daily") @map("system_mode") @db.VarChar(20)
  createdAt    DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("attendance_records")
}

model PayrollRecord {
  id                    Int      @id @default(autoincrement())
  companyId             Int      @default(1) @map("company_id")
  employeeId            String?  @map("employee_id") @db.VarChar(50)
  periodMonth           Int?     @map("period_month")
  periodYear            Int?     @map("period_year")
  baseSalary            Decimal? @map("base_salary")
  totalHours            Decimal? @map("total_hours")
  requiredHours         Decimal? @map("required_hours")
  hourDiff              Decimal? @map("hour_diff")
  adjustment            Decimal?
  socialSecurityDeduct  Decimal  @default(0) @map("social_security_deduct")
  bonusTotal            Decimal  @default(0) @map("bonus_total")
  deductionTotal        Decimal  @default(0) @map("deduction_total")
  netSalary             Decimal? @map("net_salary")
  status                String?  @db.VarChar(50)
  dailyBreakdown        Json?    @map("daily_breakdown")
  systemMode            String   @default("daily") @map("system_mode") @db.VarChar(20)
  calculatedAt          DateTime @default(now()) @map("calculated_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("payroll_records")
}

model BonusDeduction {
  id           Int      @id @default(autoincrement())
  companyId    Int      @default(1) @map("company_id")
  employeeId   String?  @map("employee_id") @db.VarChar(50)
  employeeName String?  @map("employee_name") @db.VarChar(255)
  type         String?  @db.VarChar(50)
  reason       String?  @db.VarChar(255)
  amount       Decimal?
  periodMonth  Int?     @map("period_month")
  periodYear   Int?     @map("period_year")
  systemMode   String   @default("daily") @map("system_mode") @db.VarChar(20)
  createdAt    DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("bonuses_deductions")
}

model UploadedFile {
  id            Int      @id @default(autoincrement())
  companyId     Int      @default(1) @map("company_id")
  filename      String?  @db.VarChar(255)
  originalName  String?  @map("original_name") @db.VarChar(255)
  fileType      String?  @map("file_type") @db.VarChar(50)
  uploadBatch   String?  @map("upload_batch") @db.VarChar(100)
  rowCount      Int?     @map("row_count")
  employeeCount Int      @default(0) @map("employee_count")
  systemMode    String   @default("daily") @map("system_mode") @db.VarChar(20)
  createdAt     DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("uploaded_files")
}

model LeaveRequest {
  id           Int      @id @default(autoincrement())
  companyId    Int      @default(1) @map("company_id")
  employeeId   String?  @map("employee_id") @db.VarChar(50)
  employeeName String?  @map("employee_name") @db.VarChar(255)
  leaveType    String?  @map("leave_type") @db.VarChar(50)
  startDate    DateTime? @map("start_date") @db.Date
  endDate      DateTime? @map("end_date") @db.Date
  daysCount    Int?     @map("days_count")
  reason       String?
  status       String   @default("pending") @db.VarChar(20)
  adminNote    String?  @map("admin_note")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("leave_requests")
}

model LeaveBalance {
  id          Int  @id @default(autoincrement())
  companyId   Int  @default(1) @map("company_id")
  employeeId  String? @map("employee_id") @db.VarChar(50)
  year        Int?
  annualTotal Int  @default(14) @map("annual_total")
  annualUsed  Int  @default(0)  @map("annual_used")
  sickTotal   Int  @default(14) @map("sick_total")
  sickUsed    Int  @default(0)  @map("sick_used")

  company Company @relation(fields: [companyId], references: [id])

  @@unique([employeeId, year])
  @@map("leave_balances")
}

model OfficialHoliday {
  id          Int      @id @default(autoincrement())
  companyId   Int      @default(1) @map("company_id")
  name        String?  @db.VarChar(255)
  holidayDate DateTime @unique @map("holiday_date") @db.Date
  createdAt   DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("official_holidays")
}

model Task {
  id         Int      @id @default(autoincrement())
  companyId  Int      @default(1) @map("company_id")
  taskName   String   @map("task_name") @db.VarChar(255)
  employeeId String?  @map("employee_id") @db.VarChar(50)
  deadline   DateTime? @db.Date
  status     String   @default("pending") @db.VarChar(50)
  systemMode String   @default("daily") @map("system_mode") @db.VarChar(20)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("tasks")
}

model RemoteAssignment {
  id         Int      @id @default(autoincrement())
  companyId  Int      @default(1) @map("company_id")
  employeeId String   @map("employee_id") @db.VarChar(50)
  startDate  DateTime @map("start_date") @db.Date
  endDate    DateTime @map("end_date") @db.Date
  label      String?  @db.VarChar(255)
  note       String?
  createdAt  DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id])

  @@unique([employeeId, startDate, endDate], map: "remote_assignments_unique_idx")
  @@map("remote_assignments")
}

model Announcement {
  id                 Int      @id @default(autoincrement())
  companyId          Int      @default(1) @map("company_id")
  title              String   @db.VarChar(255)
  message            String
  published          Boolean  @default(false)
  visibleToEmployees Boolean  @default(true) @map("visible_to_employees")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id])

  @@map("announcements")
}
```

- [ ] **Step 3: Generate Prisma client and create first migration against Supabase**

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Expected: a folder `prisma/migrations/<timestamp>_init/` appears, and Supabase now contains all 14 tables. Verify in the Supabase dashboard → Table Editor.

- [ ] **Step 4: Commit**

```bash
git add prisma/ package.json package-lock.json
git commit -m "feat(db): prisma schema mirroring legacy postgres tables"
```

---

### Task 4: Prisma client singleton + auth helpers

**Files:**
- Create: `lib/prisma.ts`, `lib/auth.ts`, `middleware.ts`

- [ ] **Step 1: Write `lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 2: Write `lib/auth.ts`**

This file is the single source of truth for JWT signing/verifying and route protection. It uses `jsonwebtoken` on the node runtime (for API routes) and `jose` for the edge middleware.

```ts
import jwt from "jsonwebtoken";
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const SECRET = process.env.JWT_SECRET!;
if (!SECRET) throw new Error("JWT_SECRET is not set");

export type SessionUser = {
  id: number;
  role: "super_admin" | "owner" | "hr" | "employee";
  companyId: number | null;
  email?: string | null;
  name: string;
};

// ---- Node runtime (API route handlers) ----
export function signJwt(payload: SessionUser): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyJwtNode(token: string): SessionUser {
  return jwt.verify(token, SECRET) as SessionUser;
}

export async function requireAuth(req: NextRequest): Promise<SessionUser> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Missing token");
  try {
    return verifyJwtNode(token);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function requireRole(user: SessionUser, roles: SessionUser["role"][]) {
  if (!roles.includes(user.role)) throw new HttpError(403, "Forbidden");
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("Unhandled API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// ---- Edge runtime (middleware.ts) ----
const encodedSecret = new TextEncoder().encode(SECRET);

export async function verifyJwtEdge(token: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, encodedSecret);
  return payload as unknown as SessionUser;
}
```

- [ ] **Step 3: Write `middleware.ts` at repo root**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifyJwtEdge } from "@/lib/auth";

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register-company",
  "/api/health",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  try {
    await verifyJwtEdge(token);
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
```

- [ ] **Step 4: Type-check passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/prisma.ts lib/auth.ts middleware.ts
git commit -m "feat(auth): prisma singleton + jwt helpers + edge middleware"
```

---

### Task 5: Port `/api/auth/*` routes

**Files:**
- Create: `app/api/auth/login/route.ts`, `app/api/auth/register-company/route.ts`, `app/api/auth/me/route.ts`, `app/api/auth/change-password/route.ts`, `app/api/health/route.ts`
- Read: `backend/src/routes/auth.js` (source for parity)

- [ ] **Step 1: Write `app/api/health/route.ts`**

```ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
```

- [ ] **Step 2: Write `app/api/auth/login/route.ts`**

Port the existing login logic from `backend/src/routes/auth.js`. Preserve: super_admin shortcut, company status='pending' guard (403), is_active guard, must_change_password flag in response.

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signJwt, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) throw new HttpError(400, "Email and password are required");

    const user = await prisma.user.findFirst({
      where: { email },
      include: { company: true },
    });
    if (!user) throw new HttpError(401, "Invalid credentials");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new HttpError(401, "Invalid credentials");

    if (!user.isActive) throw new HttpError(403, "Account is inactive");
    if (user.role !== "super_admin" && user.company && user.company.status === "pending") {
      throw new HttpError(403, "Company registration is pending administrator approval.");
    }
    if (user.role !== "super_admin" && user.company && !user.company.isActive) {
      throw new HttpError(403, "Company is suspended.");
    }

    const token = signJwt({
      id: user.id,
      role: user.role as any,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 3: Write `app/api/auth/register-company/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, slug, ownerName, email, password } = body as {
      companyName?: string; slug?: string; ownerName?: string; email?: string; password?: string;
    };
    if (!companyName || !slug || !ownerName || !email || !password) {
      throw new HttpError(400, "All fields are required");
    }
    if (!SLUG_RE.test(slug)) throw new HttpError(400, "Slug must be lowercase letters, digits, and dashes");
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");

    const existingSlug = await prisma.company.findUnique({ where: { slug } });
    if (existingSlug) throw new HttpError(409, "Company slug already taken");

    const existingEmail = await prisma.user.findFirst({ where: { email } });
    if (existingEmail) throw new HttpError(409, "Email already in use");

    const hash = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: { name: companyName, slug, status: "pending", isActive: false },
    });

    await prisma.user.create({
      data: {
        name: ownerName,
        email,
        password: hash,
        role: "owner",
        companyId: company.id,
        isActive: true,
      },
    });

    return NextResponse.json({
      pending: true,
      message: "Registration submitted! Awaiting admin approval before you can log in.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 4: Write `app/api/auth/me/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, role: true, companyId: true, mustChangePassword: true },
    });
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 5: Write `app/api/auth/change-password/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || newPassword.length < 8) throw new HttpError(400, "New password must be at least 8 characters");

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) throw new HttpError(404, "User not found");

    if (!user.mustChangePassword) {
      const ok = await bcrypt.compare(currentPassword || "", user.password);
      if (!ok) throw new HttpError(401, "Current password is incorrect");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
```

In a second terminal:

```bash
curl -X POST http://localhost:3000/api/auth/register-company -H "Content-Type: application/json" -d '{"companyName":"Acme","slug":"acme","ownerName":"Alice","email":"alice@acme.test","password":"password123"}'
```

Expected: `{"pending":true,"message":"..."}` and a row appears in the Supabase `companies` table with `status='pending'`.

- [ ] **Step 7: Commit**

```bash
git add app/api/
git commit -m "feat(api): port auth routes (login, register-company, me, change-password)"
```

---

### Task 6: Port `/api/companies/*` routes (super_admin scope)

**Files:**
- Create: `app/api/companies/route.ts`, `app/api/companies/[id]/route.ts`, `app/api/companies/[id]/approve/route.ts`, `app/api/companies/[id]/reject/route.ts`
- Read: `backend/src/routes/companies.js`

- [ ] **Step 1: Write `app/api/companies/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { employees: true } } },
    });

    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        isActive: c.isActive,
        createdAt: c.createdAt,
        employeeCount: c._count.employees,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Write `app/api/companies/[id]/route.ts`** (PATCH for suspend/reactivate, DELETE)

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    const { isActive } = await req.json();
    if (typeof isActive !== "boolean") throw new HttpError(400, "isActive boolean required");
    const updated = await prisma.company.update({
      where: { id: Number(id) },
      data: { isActive, status: isActive ? "active" : "suspended" },
    });
    return NextResponse.json({ company: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    await prisma.company.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 3: Write `app/api/companies/[id]/approve/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: { status: "active", isActive: true },
    });
    return NextResponse.json({ company });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 4: Write `app/api/companies/[id]/reject/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: { status: "rejected", isActive: false },
    });
    return NextResponse.json({ company });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/companies/
git commit -m "feat(api): port companies routes (list, approve, reject, suspend, delete)"
```

---

### Task 7: Port `/api/employees/*` and `/api/settings/*` routes

**Files:**
- Create: `app/api/employees/route.ts`, `app/api/employees/[id]/route.ts`, `app/api/settings/route.ts`
- Read: `backend/src/routes/employees.js`, `backend/src/routes/settings.js`

- [ ] **Step 1: Write `app/api/employees/route.ts`**

GET lists employees scoped to the caller's `companyId`. POST creates one.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const employees = await prisma.employee.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ employees });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const employee = await prisma.employee.create({
      data: {
        companyId: session.companyId,
        employeeId: body.employeeId ?? null,
        name: body.name,
        email: body.email ?? "",
        religion: body.religion ?? "",
        baseSalary: body.baseSalary ?? 0,
        socialSecurity: !!body.socialSecurity,
        remoteDays: body.remoteDays ?? 0,
        systemMode: body.systemMode ?? "daily",
      },
    });
    return NextResponse.json({ employee });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Write `app/api/employees/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

async function ensureOwned(id: number, companyId: number) {
  const row = await prisma.employee.findUnique({ where: { id } });
  if (!row || row.companyId !== companyId) throw new HttpError(404, "Not found");
  return row;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    await ensureOwned(Number(id), session.companyId);
    const body = await req.json();
    const employee = await prisma.employee.update({
      where: { id: Number(id) },
      data: {
        name: body.name,
        email: body.email,
        religion: body.religion,
        baseSalary: body.baseSalary,
        socialSecurity: body.socialSecurity,
        remoteDays: body.remoteDays,
        systemMode: body.systemMode,
      },
    });
    return NextResponse.json({ employee });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    await ensureOwned(Number(id), session.companyId);
    await prisma.employee.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 3: Write `app/api/settings/route.ts`**

GET returns the caller's company settings (creating defaults if none); PATCH updates them. Mirror field-by-field with `backend/src/routes/settings.js`.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    let settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    if (!settings) {
      settings = await prisma.companySettings.create({ data: { companyId: session.companyId } });
    }
    return NextResponse.json({ settings });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const body = await req.json();
    const existing = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const settings = existing
      ? await prisma.companySettings.update({ where: { id: existing.id }, data: body })
      : await prisma.companySettings.create({ data: { ...body, companyId: session.companyId } });
    return NextResponse.json({ settings });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/employees/ app/api/settings/
git commit -m "feat(api): port employees and settings routes with tenant scoping"
```

---

### Task 8: Port payroll, bonuses, leaves routes

**Files:**
- Create: `app/api/payroll/route.ts`, `app/api/payroll/calculate/route.ts`, `app/api/bonuses/route.ts`, `app/api/bonuses/[id]/route.ts`, `app/api/leaves/route.ts`, `app/api/leaves/[id]/route.ts`, `app/api/leaves/balances/route.ts`
- Read: `backend/src/routes/payroll.js`, `backend/src/routes/bonuses.js`, `backend/src/routes/leaves.js`

- [ ] **Step 1: Open each source route file and list every exported handler**

For each of payroll.js, bonuses.js, leaves.js, write down: HTTP method, path, what it reads, what it writes. This is the parity checklist for this task.

- [ ] **Step 2: Port payroll list + calculate**

`app/api/payroll/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const url = new URL(req.url);
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));
    const where: any = { companyId: session.companyId };
    if (month) where.periodMonth = month;
    if (year) where.periodYear = year;
    const records = await prisma.payrollRecord.findMany({ where, orderBy: { calculatedAt: "desc" } });
    return NextResponse.json({ records });
  } catch (err) {
    return errorResponse(err);
  }
}
```

`app/api/payroll/calculate/route.ts`: lift the calculation logic from `backend/src/routes/payroll.js` POST `/calculate` handler verbatim, replacing `pool.query(...)` with the equivalent `prisma.payrollRecord.upsert/create` / `prisma.attendanceRecord.findMany` calls. The math (hour_diff, deductions, bonus_total, net_salary) is unchanged.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { month, year, systemMode = "daily" } = await req.json();
    if (!month || !year) throw new HttpError(400, "month and year required");

    const employees = await prisma.employee.findMany({
      where: { companyId: session.companyId, systemMode },
    });

    // Pseudocode placeholder — copy the exact calc loop from
    // backend/src/routes/payroll.js, replacing pg queries with prisma calls.
    // Inputs per employee: attendanceRecords filtered by employeeId + month + year;
    //                     bonusesDeductions filtered the same way;
    //                     companySettings for required hours, deduction/extra rates.
    // Outputs: upsert payrollRecord per employee.

    return NextResponse.json({ ok: true, count: employees.length });
  } catch (err) {
    return errorResponse(err);
  }
}
```

When porting the calc loop, keep variable names identical to the Express version so a diff against `backend/src/routes/payroll.js` is easy to review.

- [ ] **Step 3: Port `app/api/bonuses/route.ts` (GET list + POST create) and `app/api/bonuses/[id]/route.ts` (DELETE)**

Same scoping pattern as employees: GET filters by `companyId`, POST inserts with `companyId: session.companyId`, DELETE ensures ownership via `ensureOwned`.

- [ ] **Step 4: Port `app/api/leaves/route.ts` (GET + POST), `app/api/leaves/[id]/route.ts` (PATCH approve/reject + DELETE), `app/api/leaves/balances/route.ts` (GET + PATCH)**

Same scoping pattern. The balance route auto-creates a row for the current year if missing — mirror that behavior.

- [ ] **Step 5: Smoke test the calculator end-to-end**

Use the previously created `alice@acme.test` user (after approving Acme via the super_admin UI which we'll build later — for now approve via SQL: `UPDATE companies SET status='active', is_active=true WHERE slug='acme';`). Create an employee + one attendance record + one bonus, then POST `/api/payroll/calculate` with `{month: 5, year: 2026}`. Verify a `payroll_records` row appears in Supabase.

- [ ] **Step 6: Commit**

```bash
git add app/api/payroll/ app/api/bonuses/ app/api/leaves/
git commit -m "feat(api): port payroll, bonuses, leaves with tenant scoping"
```

---

### Task 9: Port tasks, remote_assignments, announcements, upload, copilot routes

**Files:**
- Create: `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/remote-assignments/route.ts`, `app/api/remote-assignments/[id]/route.ts`, `app/api/announcements/route.ts`, `app/api/announcements/[id]/route.ts`, `app/api/upload/route.ts`, `app/api/copilot/route.ts`
- Read: `backend/src/routes/tasks.js`, `backend/src/routes/remote_assignments.js`, `backend/src/routes/announcements.js`, `backend/src/routes/upload.js`, `backend/src/routes/copilot.js`

- [ ] **Step 1: Port tasks routes**

GET (list filtered by companyId), POST (create), PATCH (update status), DELETE — same scoping pattern as employees. Field set: `taskName`, `employeeId`, `deadline`, `status`, `systemMode`.

- [ ] **Step 2: Port remote-assignments routes**

GET, POST (with the unique constraint on `(employee_id, start_date, end_date)` — catch the Prisma `P2002` error and return 409 `{error: "Assignment already exists"}`), DELETE.

- [ ] **Step 3: Port announcements routes**

GET (employees see only `published=true AND visibleToEmployees=true`; owner/hr see all), POST (owner/hr only), PATCH, DELETE.

- [ ] **Step 4: Port upload route**

The Express version uses `multer` for multipart parsing. In Next.js App Router, use the built-in `req.formData()` API:

```ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const formData = await req.formData();
    const file = formData.get("file");
    const fileType = String(formData.get("fileType") || "attendance");
    const systemMode = String(formData.get("systemMode") || "daily");
    if (!(file instanceof File)) throw new HttpError(400, "file is required");

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

    // Port the row-mapping + insert loop from backend/src/routes/upload.js verbatim,
    // replacing pg calls with prisma.attendanceRecord.createMany or
    // prisma.employee.upsert depending on fileType.

    const batch = `${Date.now()}`;
    await prisma.uploadedFile.create({
      data: {
        companyId: session.companyId,
        filename: file.name,
        originalName: file.name,
        fileType,
        uploadBatch: batch,
        rowCount: rows.length,
        systemMode,
      },
    });

    return NextResponse.json({ ok: true, batch, rowCount: rows.length });
  } catch (err) {
    return errorResponse(err);
  }
}
```

When porting the row-mapping loop, keep the exact column-name lookups (`row["Employee ID"]`, etc.) from `backend/src/utils/excelParser.js` — bring that helper over to `lib/excelParser.ts` if the logic is non-trivial.

- [ ] **Step 5: Port copilot route**

This is a simple proxy — copy the body of `backend/src/routes/copilot.js` POST handler. Keep the same prompt construction.

- [ ] **Step 6: Commit**

```bash
git add app/api/tasks/ app/api/remote-assignments/ app/api/announcements/ app/api/upload/ app/api/copilot/ lib/excelParser.ts
git commit -m "feat(api): port tasks, remote, announcements, upload, copilot routes"
```

---

### Task 10: Port i18n, client API helper, and shared components

**Files:**
- Create: `lib/i18n/LanguageContext.tsx`, `lib/i18n/useLanguage.ts`, `lib/i18n/translations.ts`, `lib/api.ts`, `components/Layout.tsx`, `components/StatCard.tsx`, `components/LangToggle.tsx`, `components/AuthGate.tsx`
- Read: `frontend/src/i18n/LanguageContext.jsx`, `frontend/src/i18n/translations.js`, `frontend/src/hooks/useLanguage.js`, `frontend/src/components/Layout.jsx`, `frontend/src/components/StatCard.jsx`, `frontend/src/utils/api.js`

- [ ] **Step 1: Port `lib/i18n/translations.ts`**

Copy the contents of `frontend/src/i18n/translations.js` and add a TypeScript type for the object:

```ts
export type Lang = "en" | "ar";
export const translations = {
  en: { /* paste from old file */ },
  ar: { /* paste from old file */ },
} as const;
export type TranslationKey = keyof typeof translations["en"];
```

- [ ] **Step 2: Port `lib/i18n/LanguageContext.tsx`**

```tsx
"use client";
import { createContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang } from "./translations";

export const LanguageContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}>({ lang: "ar", setLang: () => {}, t: (k) => k });

const STORAGE_KEY = "paynest_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (stored === "en" || stored === "ar") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: string) => (translations[lang] as Record<string, string>)[key] ?? key;

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}
```

- [ ] **Step 3: Port `lib/i18n/useLanguage.ts`**

```ts
"use client";
import { useContext } from "react";
import { LanguageContext } from "./LanguageContext";
export function useLanguage() { return useContext(LanguageContext); }
```

- [ ] **Step 4: Write `lib/api.ts`** (the client-side fetch wrapper that replaces `frontend/src/utils/api.js`)

Since the API and the frontend are now in the same Next.js app, `BASE` is always relative — no more `VITE_API_URL`.

```ts
type Json = Record<string, unknown> | unknown[] | null;

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(method: string, path: string, body?: Json, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init?.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body == null ? undefined : JSON.stringify(body), ...init });
  } catch (e: any) {
    throw new ApiError(0, e?.message || "Network error");
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/") window.location.href = "/";
    }
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  let data: any = null;
  try { data = await res.json(); } catch { /* empty body ok */ }
  if (!res.ok) {
    const msg = typeof data?.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  get:    <T>(p: string)            => request<T>("GET",    p),
  post:   <T>(p: string, body?: Json) => request<T>("POST",   p, body),
  patch:  <T>(p: string, body?: Json) => request<T>("PATCH",  p, body),
  delete: <T>(p: string)            => request<T>("DELETE", p),
};

export { ApiError };
```

- [ ] **Step 5: Port `components/LangToggle.tsx`**

```tsx
"use client";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/useLanguage";

export function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      aria-label="Toggle language"
    >
      <Globe className="w-4 h-4" />
      {lang === "ar" ? "EN" : "AR"}
    </button>
  );
}
```

- [ ] **Step 6: Port `components/StatCard.tsx` and `components/Layout.tsx`**

Convert each `frontend/src/components/*.jsx` file to TypeScript. Replace `useNavigate` from react-router with `useRouter` from `next/navigation`. Replace `<Link to="x">` with `<Link href="x">` from `next/link`.

- [ ] **Step 7: Write `components/AuthGate.tsx`**

This replaces the auth-check that `frontend/src/App.jsx` did at the router level. It runs in the `(app)/layout.tsx`.

```tsx
"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/"); return; }
    setReady(true);
  }, [router]);
  if (!ready) return null;
  return <>{children}</>;
}
```

- [ ] **Step 8: Wrap root layout with LanguageProvider**

Edit `app/layout.tsx`:

```tsx
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

export const metadata = { title: "PayNest", description: "HR & Payroll" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add lib/ components/ app/layout.tsx
git commit -m "feat(ui): port i18n, api client, shared components to App Router"
```

---

### Task 11: Port public pages (landing, HR login, employee login, signup)

**Files:**
- Create: `app/page.tsx`, `app/(auth)/hr-login/page.tsx`, `app/(auth)/employee-login/page.tsx`, `app/(auth)/signup/page.tsx`
- Read: `frontend/src/App.jsx` (contains `LandingPage`, `LoginForm`, `SignupPage`)

- [ ] **Step 1: Port `LandingPage` to `app/page.tsx`**

Copy the JSX of the `LandingPage` component from `frontend/src/App.jsx`. Replace `useNavigate` with `useRouter().push`. Add `"use client";` at the top. Keep the two-portal card design (HR Portal blue, Employee Portal dark) and the `<LangToggle />` in the header.

- [ ] **Step 2: Port `LoginForm` for HR portal**

Create `app/(auth)/hr-login/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { LangToggle } from "@/components/LangToggle";

type LoginResponse = {
  token: string;
  user: { id: number; name: string; email: string; role: string; companyId: number | null; mustChangePassword: boolean };
};

export default function HrLoginPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<LoginResponse>("/auth/login", { email, password });
      if (!["owner", "hr", "super_admin"].includes(res.user.role)) {
        throw new Error(ar ? "هذا الحساب ليس حساب موارد بشرية" : "This account is not an HR account");
      }
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      router.replace(res.user.role === "super_admin" ? "/super-admin" : "/dashboard");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  // ... render: title "HR Portal", email/password inputs, show/hide password, submit button, link to /signup, <LangToggle/> in header.
  // Copy the JSX from the LoginForm component in frontend/src/App.jsx and adapt.
}
```

When copying the JSX, replace every `setError(safeError(...))` with `setError(e?.message || "...")` — the `api.ts` client already produces clean string messages, so `safeError` is no longer needed.

- [ ] **Step 3: Port `LoginForm` for employee portal**

Create `app/(auth)/employee-login/page.tsx` — identical to `hr-login/page.tsx` except the role guard accepts only `["employee"]` and routes to `/employee-portal` on success. Title: "Employee Portal".

- [ ] **Step 4: Port `SignupPage` to `app/(auth)/signup/page.tsx`**

Copy `SignupPage` from `frontend/src/App.jsx`. Preserve: slug regex `/^[a-z0-9][a-z0-9-]*$/`, slug-from-name auto-generation, pending banner on success (`if (res.pending) setPending(true)`).

- [ ] **Step 5: Manual smoke test of the whole auth flow**

```bash
npm run dev
```

Visit http://localhost:3000:
1. Click HR Portal → login as `admin@paynest.com` (after running the seed in Task 13).
2. Visit `/signup` → create a test company → verify pending banner shows.
3. In Supabase, run `UPDATE companies SET status='active', is_active=true WHERE slug='<your-test-slug>';` then log in as the new owner.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx "app/(auth)/"
git commit -m "feat(ui): port landing, hr-login, employee-login, signup pages"
```

---

### Task 12: Port protected pages and the (app) layout

**Files:**
- Create: `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/employees/page.tsx`, `app/(app)/payroll/page.tsx`, `app/(app)/bonuses/page.tsx`, `app/(app)/leaves/page.tsx`, `app/(app)/tasks/page.tsx`, `app/(app)/remote/page.tsx`, `app/(app)/announcements/page.tsx`, `app/(app)/upload/page.tsx`, `app/(app)/reports/page.tsx`, `app/(app)/settings/page.tsx`, `app/(app)/system-select/page.tsx`, `app/(app)/owner-setup/page.tsx`, `app/(app)/employee-portal/page.tsx`, `app/(app)/super-admin/page.tsx`
- Read: each corresponding file in `frontend/src/pages/`

- [ ] **Step 1: Write `app/(app)/layout.tsx`**

```tsx
import { AuthGate } from "@/components/AuthGate";
import { Layout } from "@/components/Layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Layout>{children}</Layout>
    </AuthGate>
  );
}
```

- [ ] **Step 2: Port each page one at a time, committing after each**

For each `frontend/src/pages/<Name>.jsx`, create `app/(app)/<kebab-name>/page.tsx`. The mechanical conversion:

1. Add `"use client";` at the top (all these pages use state + effects).
2. Convert `.jsx` extension/imports to `.tsx`. Add prop and state types as you encounter them.
3. Replace `import { useNavigate } from "react-router-dom"` → `import { useRouter } from "next/navigation"`. Replace `navigate("/x")` → `router.push("/x")`.
4. Replace `import { Link } from "react-router-dom"` → `import Link from "next/link"`, and `<Link to="x">` → `<Link href="x">`.
5. Replace `import api from "../../utils/api"` → `import { api } from "@/lib/api"`. Then convert calls: `api.get("/employees")` works the same shape, but the response shape — what was previously `res.data` — is now the parsed JSON directly. So `const res = await api.get("/employees"); res.data.employees` becomes `const data = await api.get<{employees: Employee[]}>("/employees"); data.employees`.
6. Replace `useLanguage` import path: `"../hooks/useLanguage"` → `"@/lib/i18n/useLanguage"`.
7. Keep all JSX, Tailwind classes, and component structure identical.

Suggested commit order (so each commit is a working slice):

  a. `dashboard` + `system-select` + `owner-setup` (simple landing pages)
  b. `employees` (CRUD table)
  c. `payroll` + `bonuses` (depends on employees)
  d. `leaves` (independent)
  e. `tasks` + `remote` (independent)
  f. `announcements` (independent)
  g. `upload` (uses formData — verify multipart upload still works)
  h. `reports` (read-only aggregates)
  i. `settings`
  j. `employee-portal` (employee role view)
  k. `super-admin` (the CEO dashboard with stats tabs)

After each slice, commit:

```bash
git add "app/(app)/<slice>/"
git commit -m "feat(ui): port <slice> page to App Router"
```

- [ ] **Step 3: Verify type-check passes after each page**

```bash
npx tsc --noEmit
```

Fix any type errors before moving to the next page.

- [ ] **Step 4: Smoke-test each ported page in the browser**

For each page, log in with a relevant role and click through the primary flow:
- Employees: create, edit, delete one row.
- Payroll: run a calculation.
- Leaves: submit a request, approve it from owner account.
- Upload: upload a small test xlsx.
- Super-admin: approve a pending company.

If something is broken, fix it now — don't accumulate UI debt.

---

### Task 13: Data migration from Render Postgres → Supabase

**Files:**
- Create: `scripts/migrate-data-from-render.ts`, `prisma/seed.ts`

This task is run ONCE, when the new app is feature-complete and you're ready to cut over. Do not run it earlier — Supabase has been the dev DB until now and may contain test rows; this script will wipe and re-import.

- [ ] **Step 1: Write `prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "super_admin" } });
  if (existing) {
    console.log("Super admin already exists:", existing.email);
    return;
  }
  const hash = await bcrypt.hash("Admin@2026", 10);
  const user = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@paynest.com",
      password: hash,
      role: "super_admin",
      isActive: true,
    },
  });
  console.log("Created super admin:", user.email);
}

main().finally(() => prisma.$disconnect());
```

Wire it up by adding to `package.json`:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 2: Write `scripts/migrate-data-from-render.ts`**

This script connects to BOTH databases: the legacy Render Postgres and the new Supabase Postgres. It copies every row from every table, preserving IDs. Order matters because of foreign keys: companies and users must be inserted before any of their child tables.

```ts
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const RENDER_URL = process.env.RENDER_DATABASE_URL!;
if (!RENDER_URL) throw new Error("RENDER_DATABASE_URL not set");

const renderPool = new Pool({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient();

async function copyTable<T>(name: string, mapper: (row: any) => T, write: (rows: T[]) => Promise<unknown>) {
  const { rows } = await renderPool.query(`SELECT * FROM ${name}`);
  console.log(`[${name}] ${rows.length} rows`);
  if (rows.length === 0) return;
  await write(rows.map(mapper));
}

async function main() {
  // Wipe target in FK-safe order
  await prisma.$transaction([
    prisma.announcement.deleteMany(),
    prisma.remoteAssignment.deleteMany(),
    prisma.task.deleteMany(),
    prisma.officialHoliday.deleteMany(),
    prisma.leaveBalance.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.uploadedFile.deleteMany(),
    prisma.bonusDeduction.deleteMany(),
    prisma.payrollRecord.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.companySettings.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.user.deleteMany(),
    prisma.company.deleteMany(),
  ]);

  await copyTable("companies", (r) => ({
    id: r.id, name: r.name, slug: r.slug,
    status: r.status ?? "active", isActive: r.is_active ?? true,
    createdAt: r.created_at,
  }), (rows) => prisma.company.createMany({ data: rows as any }));

  await copyTable("users", (r) => ({
    id: r.id, name: r.name, employeeNumber: r.employee_number,
    email: r.email, password: r.password, role: r.role,
    isActive: r.is_active ?? true,
    mustChangePassword: r.must_change_password ?? false,
    companyId: r.company_id, createdAt: r.created_at,
  }), (rows) => prisma.user.createMany({ data: rows as any }));

  // ... repeat the same pattern for every other table:
  //   company_settings, employees, attendance_records, payroll_records,
  //   bonuses_deductions, uploaded_files, leave_requests, leave_balances,
  //   official_holidays, tasks, remote_assignments, announcements.
  // For each one: copyTable("snake_name", mapToPrismaShape, createMany).

  // Reset sequences so new inserts don't collide with imported ids
  const tables = [
    "companies","users","company_settings","employees","attendance_records",
    "payroll_records","bonuses_deductions","uploaded_files","leave_requests",
    "leave_balances","official_holidays","tasks","remote_assignments","announcements",
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1), true)`
    );
  }

  console.log("Migration complete.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => Promise.all([renderPool.end(), prisma.$disconnect()]));
```

Fill in the `// ... repeat` block by listing every table from `backend/src/db/migrations.js` and mirroring the same `copyTable` call.

- [ ] **Step 3: Run the seed against Supabase**

```bash
npx prisma db seed
```

Expected: console logs `Created super admin: admin@paynest.com`.

- [ ] **Step 4: Dry-run the migration script in a throwaway Supabase project first**

Create a second Supabase project (call it `paynest-migration-test`), point `DATABASE_URL`+`DIRECT_URL` to it, run `npx prisma migrate deploy` then run:

```bash
RENDER_DATABASE_URL="postgresql://...your render external url..." npx tsx scripts/migrate-data-from-render.ts
```

Verify in the test Supabase dashboard that row counts match Render exactly. Spot-check 2-3 users and 2-3 employees.

- [ ] **Step 5: When confident, run for real against the production Supabase project**

Point env vars back to the real Supabase project, then:

```bash
RENDER_DATABASE_URL="postgresql://..." npx tsx scripts/migrate-data-from-render.ts
```

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts scripts/migrate-data-from-render.ts package.json
git commit -m "feat(migration): one-shot data import from render postgres to supabase"
```

---

### Task 14: Vercel deployment and cutover

**Files:**
- Modify: Vercel project settings (no repo changes except possibly `next.config.ts`)

- [ ] **Step 1: Push the migration branch**

```bash
git push -u origin next-migration
```

This triggers a Vercel preview deploy automatically (Vercel deploys every branch by default).

- [ ] **Step 2: Set environment variables on Vercel for the preview**

Vercel dashboard → paynest project → Settings → Environment Variables → add for `Preview` and `Production`:
- `DATABASE_URL` (Supabase pooler)
- `DIRECT_URL` (Supabase direct)
- `JWT_SECRET`
- `NEXT_PUBLIC_SITE_URL` (set per environment)

- [ ] **Step 3: Trigger a rebuild and test the preview URL**

In Vercel, click "Redeploy" on the latest `next-migration` deployment so it picks up the new env vars.

Open the preview URL. Log in as `admin@paynest.com / Admin@2026`. Verify:
- HR portal login works
- Employee portal login works
- Signup creates a pending company
- Super-admin can approve it
- Employees CRUD works
- Payroll calculates

If anything breaks, fix on the branch, push, retest.

- [ ] **Step 4: Merge to master and promote**

When the preview is verified, open a PR from `next-migration` to `master`, review the diff (it will be massive — that's expected), and merge.

```bash
git checkout master
git pull
```

Vercel automatically deploys master to production with the same env vars.

- [ ] **Step 5: Decommission Render**

Once production traffic on the new Vercel deployment is verified for 24-48 hours:
1. Render dashboard → paynest backend service → Settings → Delete service.
2. Render dashboard → paynest Postgres database → Settings → Delete (only after confirming Supabase has all the data).

- [ ] **Step 6: Final cleanup commit (remove dead code)**

```bash
git rm -rf frontend/ backend/
git commit -m "chore: remove legacy frontend/ and backend/ directories"
git push
```

---

## Operator checklist (post-migration)

- [ ] Production URL serves the Next.js app
- [ ] All 14 Supabase tables contain the imported data
- [ ] `admin@paynest.com` can log in and approve companies
- [ ] At least one owner account from the old DB can log in
- [ ] Payroll calculate produces matching numbers vs the old system on the same period
- [ ] Render service deleted, monthly bill = $0
- [ ] `.env.local` not committed (verify `git ls-files | grep .env.local` returns nothing)

---

## Out of scope (follow-up plans)

- Replacing JWT auth with NextAuth / Supabase Auth (cleaner session handling, OAuth providers, magic links)
- Moving file uploads from local disk to Supabase Storage (the current Express version writes to `backend/uploads/` which doesn't exist on Vercel's read-only FS — uploads work but are ephemeral; this is fine if upload is followed immediately by parse-and-discard, but breaks if files are meant to be re-downloaded later)
- Splitting `app/(app)/super-admin/page.tsx` if it becomes unwieldy
- Adding integration tests (Playwright) for the critical flows: signup → approve → login → CRUD
