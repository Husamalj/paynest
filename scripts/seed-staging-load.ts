import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const SEED_PREFIX = "loadtest";
const DEFAULT_COMPANIES = 500;
const DEFAULT_MIN_EMPLOYEES = 50;
const DEFAULT_MAX_EMPLOYEES = 500;
const DEFAULT_ATTENDANCE_DAYS = 5;
const DEFAULT_BATCH_SIZE = 1000;
const PASSWORD = "LoadTest123!";

function requireStagingTarget() {
  const stagingUrl = process.env.STAGING_DATABASE_URL;
  const directUrl = process.env.STAGING_DIRECT_URL || stagingUrl;

  if (!stagingUrl) {
    throw new Error("STAGING_DATABASE_URL is required. Refusing to seed without an explicit staging database.");
  }

  if (process.env.PAYNEST_ALLOW_STAGING_LOAD_SEED !== "true") {
    throw new Error("Set PAYNEST_ALLOW_STAGING_LOAD_SEED=true to confirm this staging load seed.");
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to run staging load seed in VERCEL_ENV=production.");
  }

  process.env.DATABASE_URL = stagingUrl;
  process.env.DIRECT_URL = directUrl;
}

function intFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function timeOnly(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

function employeeCountFor(index: number, minEmployees: number, maxEmployees: number) {
  if (maxEmployees < minEmployees) {
    throw new Error("STAGING_LOAD_MAX_EMPLOYEES must be greater than or equal to STAGING_LOAD_MIN_EMPLOYEES.");
  }

  const span = maxEmployees - minEmployees + 1;
  return minEmployees + ((index * 37) % span);
}

function chunk<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function createManyInBatches<T>(
  label: string,
  rows: T[],
  batchSize: number,
  createMany: (data: T[]) => Promise<unknown>
) {
  let inserted = 0;
  for (const batch of chunk(rows, batchSize)) {
    await createMany(batch);
    inserted += batch.length;
    if (inserted % (batchSize * 10) === 0 || inserted === rows.length) {
      console.log(`${label}: ${inserted}/${rows.length}`);
    }
  }
}

async function deleteExistingLoadSeed(prisma: PrismaClient) {
  const companies = await prisma.company.findMany({
    where: { slug: { startsWith: `${SEED_PREFIX}-co-` } },
    select: { id: true },
  });

  const companyIds = companies.map((company) => company.id);
  if (companyIds.length === 0) return;

  console.log(`Removing previous ${SEED_PREFIX} seed for ${companyIds.length} companies...`);

  const users = await prisma.user.findMany({
    where: { companyId: { in: companyIds } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.customRequest.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.requestType.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.companyEvent.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.message.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.advanceRequest.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.notification.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.announcement.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.jobOfferTemplate.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.jobOffer.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.bonusTier.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.evaluation.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.remoteAssignment.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.task.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.officialHoliday.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.leaveBalance.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.leaveRequest.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.uploadedFile.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.bonusDeduction.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.payrollJob.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.payrollRecord.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.monthlySalary.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.attendanceRecord.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.employeeDocument.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.companySettings.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.auditLog.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.user.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.employee.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
}

async function main() {
  requireStagingTarget();

  const companyCount = intFromEnv("STAGING_LOAD_COMPANIES", DEFAULT_COMPANIES);
  const minEmployees = intFromEnv("STAGING_LOAD_MIN_EMPLOYEES", DEFAULT_MIN_EMPLOYEES);
  const maxEmployees = intFromEnv("STAGING_LOAD_MAX_EMPLOYEES", DEFAULT_MAX_EMPLOYEES);
  const attendanceDays = intFromEnv("STAGING_LOAD_ATTENDANCE_DAYS", DEFAULT_ATTENDANCE_DAYS);
  const batchSize = intFromEnv("STAGING_LOAD_BATCH_SIZE", DEFAULT_BATCH_SIZE);

  const prisma = new PrismaClient();

  try {
    await deleteExistingLoadSeed(prisma);

    const password = await bcrypt.hash(PASSWORD, 10);
    const companies = Array.from({ length: companyCount }, (_, index) => {
      const number = index + 1;
      const employeeCount = employeeCountFor(index, minEmployees, maxEmployees);
      return {
        number,
        employeeCount,
        slug: `${SEED_PREFIX}-co-${String(number).padStart(4, "0")}`,
        name: `Load Test Company ${String(number).padStart(4, "0")}`,
      };
    });

    const totalEmployees = companies.reduce((sum, company) => sum + company.employeeCount, 0);
    console.log("Starting PayNest staging load seed:");
    console.log(`- companies: ${companyCount}`);
    console.log(`- employees: ${totalEmployees}`);
    console.log(`- attendance rows: ${totalEmployees * attendanceDays}`);
    console.log(`- fake login password: ${PASSWORD}`);

    await createManyInBatches(
      "companies",
      companies.map((company) => ({
        name: company.name,
        slug: company.slug,
        status: "active",
        isActive: true,
        maxEmployees: company.employeeCount,
        subscriptionPlan: company.employeeCount > 300 ? "enterprise" : company.employeeCount > 120 ? "growth" : "essential",
        subscriptionStatus: "active",
        billingEmail: `billing+${company.slug}@loadtest.paynest.invalid`,
        onboardingCompleted: true,
      })),
      batchSize,
      (data) => prisma.company.createMany({ data })
    );

    const createdCompanies = await prisma.company.findMany({
      where: { slug: { startsWith: `${SEED_PREFIX}-co-` } },
      select: { id: true, slug: true, name: true, maxEmployees: true },
      orderBy: { id: "asc" },
    });

    const settingsRows = [];
    const userRows = [];
    const employeeRows = [];
    const leaveBalanceRows = [];
    const attendanceRows = [];
    const payrollRows = [];
    const monthlySalaryRows = [];
    const announcementRows = [];
    const auditRows = [];

    for (const company of createdCompanies) {
      const employeeCount = company.maxEmployees || minEmployees;
      const companyNumber = company.slug.replace(`${SEED_PREFIX}-co-`, "");
      const companyCode = `LT${companyNumber}`;

      settingsRows.push({
        companyId: company.id,
        companyName: company.name,
        systemMode: "daily",
        calcMode: "daily",
        language: Number(companyNumber) % 2 === 0 ? "en" : "ar",
        reqHours: 8,
        monthDays: 26,
        lateTolerance: 10,
        workdays: "Sun,Mon,Tue,Wed,Thu",
        deductionRate: 1,
        extraRate: 1.25,
        workStartTime: "09:00",
        timezone: "Asia/Amman",
      });

      userRows.push(
        {
          companyId: company.id,
          name: `${company.name} Owner`,
          employeeNumber: `${companyCode}-OWNER`,
          email: `owner+${company.slug}@loadtest.paynest.invalid`,
          password,
          role: "owner",
          isActive: true,
          mustChangePassword: false,
          emailVerifiedAt: new Date(),
        },
        {
          companyId: company.id,
          name: `${company.name} HR`,
          employeeNumber: `${companyCode}-HR`,
          email: `hr+${company.slug}@loadtest.paynest.invalid`,
          password,
          role: "hr",
          isActive: true,
          mustChangePassword: false,
          emailVerifiedAt: new Date(),
        },
        {
          companyId: company.id,
          name: `${company.name} Employee 001`,
          employeeNumber: `${companyCode}-0001`,
          email: `employee001+${company.slug}@loadtest.paynest.invalid`,
          password,
          role: "employee",
          isActive: true,
          mustChangePassword: false,
          emailVerifiedAt: new Date(),
        }
      );

      announcementRows.push({
        companyId: company.id,
        title: "Load test announcement",
        message: "Fake staging data for performance validation.",
        published: true,
        visibleToEmployees: true,
      });

      auditRows.push({
        companyId: company.id,
        userId: 0,
        userName: "Staging Load Seed",
        userRole: "system",
        action: "create",
        entity: "company",
        entityId: company.slug,
        changes: { source: "seed-staging-load", employees: employeeCount },
      });

      for (let employeeIndex = 1; employeeIndex <= employeeCount; employeeIndex += 1) {
        const employeeId = `${companyCode}-${String(employeeIndex).padStart(4, "0")}`;
        const baseSalary = 550 + ((employeeIndex * 17) % 2200);
        const employeeName = `Load Employee ${companyNumber}-${String(employeeIndex).padStart(4, "0")}`;
        const departmentIndex = (employeeIndex % 8) + 1;

        employeeRows.push({
          companyId: company.id,
          employeeId,
          name: employeeName,
          email: `emp${String(employeeIndex).padStart(4, "0")}+${company.slug}@loadtest.paynest.invalid`,
          religion: employeeIndex % 7 === 0 ? "Christian" : "Muslim",
          baseSalary,
          phone: `+962790${String(company.id % 1000).padStart(3, "0")}${String(employeeIndex % 1000).padStart(3, "0")}`,
          socialSecurity: employeeIndex % 3 !== 0,
          remoteDays: employeeIndex % 5,
          allowance: employeeIndex % 4 === 0 ? 50 : 0,
          jobTitle: employeeIndex % 10 === 0 ? "Team Lead" : employeeIndex % 2 === 0 ? "Operations Specialist" : "HR Associate",
          nationality: "Jordanian",
          gender: employeeIndex % 2 === 0 ? "male" : "female",
          nationalId: `${company.id}${String(employeeIndex).padStart(9, "0")}`,
          birthDate: dateOnly(`199${employeeIndex % 10}-01-15`),
          joinDate: dateOnly("2025-01-01"),
          contractEndDate: dateOnly("2027-12-31"),
          department: `Department ${departmentIndex}`,
          departmentNumber: `D-${departmentIndex}`,
          systemMode: "daily",
          workType: "standard",
          workdays: "Sun,Mon,Tue,Wed,Thu",
          reqHours: 8,
        });

        leaveBalanceRows.push({
          companyId: company.id,
          employeeId,
          year: 2026,
          annualTotal: 14,
          annualUsed: employeeIndex % 6,
          sickTotal: 14,
          sickUsed: employeeIndex % 3,
        });

        monthlySalaryRows.push({
          companyId: company.id,
          periodMonth: 7,
          periodYear: 2026,
          employeeId,
          name: employeeName,
          baseSalary,
          socialSecurity: employeeIndex % 3 !== 0,
          systemMode: "daily",
        });

        payrollRows.push({
          companyId: company.id,
          employeeId,
          periodMonth: 7,
          periodYear: 2026,
          baseSalary,
          totalHours: 8 * attendanceDays - (employeeIndex % 4),
          requiredHours: 8 * attendanceDays,
          hourDiff: -(employeeIndex % 4),
          adjustment: -(employeeIndex % 4) * 5,
          socialSecurityDeduct: employeeIndex % 3 !== 0 ? Math.round(baseSalary * 0.075) : 0,
          bonusTotal: employeeIndex % 12 === 0 ? 75 : 0,
          deductionTotal: employeeIndex % 9 === 0 ? 15 : 0,
          netSalary: baseSalary + (employeeIndex % 12 === 0 ? 75 : 0) - (employeeIndex % 9 === 0 ? 15 : 0),
          status: "calculated",
          dailyBreakdown: [],
          systemMode: "daily",
        });

        for (let day = 1; day <= attendanceDays; day += 1) {
          attendanceRows.push({
            companyId: company.id,
            employeeId,
            workDate: dateOnly(`2026-07-${String(day).padStart(2, "0")}`),
            clockIn: timeOnly(employeeIndex % 5 === 0 ? "09:12" : "09:00"),
            clockOut: timeOnly(employeeIndex % 6 === 0 ? "16:45" : "17:00"),
            hoursWorked: employeeIndex % 6 === 0 ? 7.75 : employeeIndex % 5 === 0 ? 7.8 : 8,
            uploadBatch: `${SEED_PREFIX}-july-2026`,
            systemMode: "daily",
          });
        }
      }
    }

    await createManyInBatches("company settings", settingsRows, batchSize, (data) => prisma.companySettings.createMany({ data }));
    await createManyInBatches("users", userRows, batchSize, (data) => prisma.user.createMany({ data }));
    await createManyInBatches("employees", employeeRows, batchSize, (data) => prisma.employee.createMany({ data }));
    await createManyInBatches("leave balances", leaveBalanceRows, batchSize, (data) => prisma.leaveBalance.createMany({ data }));
    await createManyInBatches("monthly salaries", monthlySalaryRows, batchSize, (data) => prisma.monthlySalary.createMany({ data }));
    await createManyInBatches("payroll records", payrollRows, batchSize, (data) => prisma.payrollRecord.createMany({ data }));
    await createManyInBatches("attendance records", attendanceRows, batchSize, (data) => prisma.attendanceRecord.createMany({ data }));
    await createManyInBatches("announcements", announcementRows, batchSize, (data) => prisma.announcement.createMany({ data }));
    await createManyInBatches("audit logs", auditRows, batchSize, (data) => prisma.auditLog.createMany({ data }));

    console.log("Staging load seed completed.");
    console.log(`Owner login example: owner+${createdCompanies[0]?.slug}@loadtest.paynest.invalid / ${PASSWORD}`);
    console.log(`HR login example: hr+${createdCompanies[0]?.slug}@loadtest.paynest.invalid / ${PASSWORD}`);
    console.log(`Employee login example: employee001+${createdCompanies[0]?.slug}@loadtest.paynest.invalid / ${PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
