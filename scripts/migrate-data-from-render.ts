/**
 * One-shot data migration: Render Postgres → Supabase Postgres
 *
 * Usage:
 *   RENDER_DB_URL="postgres://..." npx tsx scripts/migrate-data-from-render.ts
 *
 * Set DATABASE_URL in .env.local to point at Supabase BEFORE running.
 * Run AFTER `npx prisma migrate dev` so the target schema exists.
 */
import { PrismaClient as SourceClient } from "@prisma/client";
import { PrismaClient as TargetClient } from "@prisma/client";

const SOURCE_URL = process.env.RENDER_DB_URL;
if (!SOURCE_URL) {
  console.error("Set RENDER_DB_URL env var to the Render Postgres connection string.");
  process.exit(1);
}

// Source: Render Postgres
const source = new SourceClient({ datasources: { db: { url: SOURCE_URL } } });
// Target: Supabase (reads DATABASE_URL from env / .env.local)
const target = new TargetClient();

async function migrate() {
  console.log("Connecting to source (Render) and target (Supabase)…");
  await source.$connect();
  await target.$connect();

  // ── Companies ─────────────────────────────────────────────────────────────
  const companies = await source.company.findMany();
  console.log(`Migrating ${companies.length} companies…`);
  for (const c of companies) {
    const data = { ...c, hiddenPages: Array.isArray(c.hiddenPages) ? c.hiddenPages : [] };
    await target.company.upsert({
      where: { id: c.id },
      create: data,
      update: data,
    });
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = await source.user.findMany();
  console.log(`Migrating ${users.length} users…`);
  for (const u of users) {
    await target.user.upsert({
      where: { id: u.id },
      create: u,
      update: u,
    });
  }

  // ── CompanySettings ────────────────────────────────────────────────────────
  const settings = await source.companySettings.findMany();
  console.log(`Migrating ${settings.length} company settings…`);
  for (const s of settings) {
    await target.companySettings.upsert({
      where: { id: s.id },
      create: s,
      update: s,
    });
  }

  // ── Employees ──────────────────────────────────────────────────────────────
  const employees = await source.employee.findMany();
  console.log(`Migrating ${employees.length} employees…`);
  for (const e of employees) {
    await target.employee.upsert({
      where: { id: e.id },
      create: e,
      update: e,
    });
  }

  // ── AttendanceRecords ──────────────────────────────────────────────────────
  const attendance = await source.attendanceRecord.findMany();
  console.log(`Migrating ${attendance.length} attendance records…`);
  for (const a of attendance) {
    await target.attendanceRecord.upsert({
      where: { id: a.id },
      create: a,
      update: a,
    });
  }

  // ── PayrollRecords ─────────────────────────────────────────────────────────
  const payroll = await source.payrollRecord.findMany();
  console.log(`Migrating ${payroll.length} payroll records…`);
  for (const p of payroll) {
     
    await target.payrollRecord.upsert({ where: { id: p.id }, create: p as any, update: p as any });
  }

  // ── BonusDeductions ────────────────────────────────────────────────────────
  const bonuses = await source.bonusDeduction.findMany();
  console.log(`Migrating ${bonuses.length} bonus/deduction entries…`);
  for (const b of bonuses) {
    await target.bonusDeduction.upsert({
      where: { id: b.id },
      create: b,
      update: b,
    });
  }

  // ── UploadedFiles ──────────────────────────────────────────────────────────
  const files = await source.uploadedFile.findMany();
  console.log(`Migrating ${files.length} uploaded file records…`);
  for (const f of files) {
    await target.uploadedFile.upsert({
      where: { id: f.id },
      create: f,
      update: f,
    });
  }

  // ── LeaveRequests ──────────────────────────────────────────────────────────
  const leaves = await source.leaveRequest.findMany();
  console.log(`Migrating ${leaves.length} leave requests…`);
  for (const l of leaves) {
    await target.leaveRequest.upsert({
      where: { id: l.id },
      create: l,
      update: l,
    });
  }

  // ── LeaveBalances ──────────────────────────────────────────────────────────
  const balances = await source.leaveBalance.findMany();
  console.log(`Migrating ${balances.length} leave balances…`);
  for (const b of balances) {
    await target.leaveBalance.upsert({
      where: { id: b.id },
      create: b,
      update: b,
    });
  }

  // ── OfficialHolidays ───────────────────────────────────────────────────────
  const holidays = await source.officialHoliday.findMany();
  console.log(`Migrating ${holidays.length} official holidays…`);
  for (const h of holidays) {
    await target.officialHoliday.upsert({
      where: { id: h.id },
      create: h,
      update: h,
    });
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const tasks = await source.task.findMany();
  console.log(`Migrating ${tasks.length} tasks…`);
  for (const t of tasks) {
    await target.task.upsert({
      where: { id: t.id },
      create: t,
      update: t,
    });
  }

  // ── RemoteAssignments ──────────────────────────────────────────────────────
  const remotes = await source.remoteAssignment.findMany();
  console.log(`Migrating ${remotes.length} remote assignments…`);
  for (const r of remotes) {
    await target.remoteAssignment.upsert({
      where: { id: r.id },
      create: r,
      update: r,
    });
  }

  // ── Announcements ──────────────────────────────────────────────────────────
  const announcements = await source.announcement.findMany();
  console.log(`Migrating ${announcements.length} announcements…`);
  for (const a of announcements) {
    await target.announcement.upsert({
      where: { id: a.id },
      create: a,
      update: a,
    });
  }

  console.log("\nMigration complete.");
}

migrate()
  .catch((e) => { console.error("Migration failed:", e); process.exit(1); })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
