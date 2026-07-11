import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEMO_SLUG = "paynest-demo";
const DEMO_EMAIL_DOMAIN = "demo.paynest.app";

function loadEnvFile(file: string) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;

  for (const rawLine of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed the demo company.");
}

if (process.env.PAYNEST_ALLOW_DEMO_SEED !== "true") {
  throw new Error("Refusing to seed demo data without PAYNEST_ALLOW_DEMO_SEED=true.");
}

const prisma = new PrismaClient();

const today = new Date();
const periodMonth = today.getMonth() + 1;
const periodYear = today.getFullYear();
const demoPassword =
  process.env.PAYNEST_DEMO_PASSWORD ||
  `Demo-${crypto.randomBytes(9).toString("base64url")}-26!`;

const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);
const timeOnly = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
};

const addDays = (base: Date, days: number) => {
  const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

type DemoEmployee = {
  employeeId: string;
  name: string;
  email: string;
  title: string;
  department: string;
  salary: number;
  socialSecurity: boolean;
  phone: string;
};

const employees: DemoEmployee[] = [
  {
    employeeId: "DEMO-001",
    name: "Lina Haddad",
    email: `lina.haddad@${DEMO_EMAIL_DOMAIN}`,
    title: "People Operations Lead",
    department: "People",
    salary: 1850,
    socialSecurity: true,
    phone: "+962790000101",
  },
  {
    employeeId: "DEMO-002",
    name: "Omar Saleh",
    email: `omar.saleh@${DEMO_EMAIL_DOMAIN}`,
    title: "Payroll Specialist",
    department: "Finance",
    salary: 1650,
    socialSecurity: true,
    phone: "+962790000102",
  },
  {
    employeeId: "DEMO-003",
    name: "Maya Nasser",
    email: `maya.nasser@${DEMO_EMAIL_DOMAIN}`,
    title: "Frontend Engineer",
    department: "Product",
    salary: 2200,
    socialSecurity: false,
    phone: "+962790000103",
  },
  {
    employeeId: "DEMO-004",
    name: "Yousef Karim",
    email: `yousef.karim@${DEMO_EMAIL_DOMAIN}`,
    title: "Account Executive",
    department: "Sales",
    salary: 1450,
    socialSecurity: true,
    phone: "+962790000104",
  },
  {
    employeeId: "DEMO-005",
    name: "Sara Mansour",
    email: `sara.mansour@${DEMO_EMAIL_DOMAIN}`,
    title: "Customer Success Manager",
    department: "Success",
    salary: 1750,
    socialSecurity: false,
    phone: "+962790000105",
  },
];

const demoUsers = [
  {
    role: "owner" as const,
    name: "Demo Owner",
    email: `owner@${DEMO_EMAIL_DOMAIN}`,
    employeeNumber: "DEMO-OWN",
  },
  {
    role: "hr" as const,
    name: "Demo HR Manager",
    email: `hr@${DEMO_EMAIL_DOMAIN}`,
    employeeNumber: "DEMO-HR",
  },
  {
    role: "employee" as const,
    name: "Lina Haddad",
    email: `employee@${DEMO_EMAIL_DOMAIN}`,
    employeeNumber: "DEMO-001",
  },
];

async function resetDemoTenant(companyId: number) {
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { companyId } }),
    prisma.notification.deleteMany({ where: { companyId } }),
    prisma.auditLog.deleteMany({ where: { companyId } }),
    prisma.customRequest.deleteMany({ where: { companyId } }),
    prisma.requestType.deleteMany({ where: { companyId } }),
    prisma.companyEvent.deleteMany({ where: { companyId } }),
    prisma.advanceRequest.deleteMany({ where: { companyId } }),
    prisma.announcement.deleteMany({ where: { companyId } }),
    prisma.jobOfferTemplate.deleteMany({ where: { companyId } }),
    prisma.jobOffer.deleteMany({ where: { companyId } }),
    prisma.evaluation.deleteMany({ where: { companyId } }),
    prisma.task.deleteMany({ where: { companyId } }),
    prisma.bonusTier.deleteMany({ where: { companyId } }),
    prisma.bonusDeduction.deleteMany({ where: { companyId } }),
    prisma.payrollRecord.deleteMany({ where: { companyId } }),
    prisma.monthlySalary.deleteMany({ where: { companyId } }),
    prisma.attendanceRecord.deleteMany({ where: { companyId } }),
    prisma.officialHoliday.deleteMany({ where: { companyId } }),
    prisma.leaveBalance.deleteMany({ where: { companyId } }),
    prisma.leaveRequest.deleteMany({ where: { companyId } }),
    prisma.remoteAssignment.deleteMany({ where: { companyId } }),
    prisma.employeeDocument.deleteMany({ where: { companyId } }),
    prisma.employee.deleteMany({ where: { companyId } }),
    prisma.uploadedFile.deleteMany({ where: { companyId } }),
    prisma.companySettings.deleteMany({ where: { companyId } }),
    prisma.user.deleteMany({ where: { companyId } }),
  ]);

  const remaining = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.employee.count({ where: { companyId } }),
    prisma.task.count({ where: { companyId } }),
    prisma.payrollRecord.count({ where: { companyId } }),
    prisma.attendanceRecord.count({ where: { companyId } }),
    prisma.leaveRequest.count({ where: { companyId } }),
    prisma.message.count({ where: { companyId } }),
  ]);
  const totalRemaining = remaining.reduce((sum, count) => sum + count, 0);
  if (totalRemaining > 0) {
    throw new Error(`Demo tenant cleanup failed; ${totalRemaining} scoped records remain.`);
  }
}

async function ensureCompany() {
  const existing = await prisma.company.findUnique({ where: { slug: DEMO_SLUG } });
  const company = existing
    ? await prisma.company.update({
        where: { id: existing.id },
        data: {
          name: "PayNest Demo Company",
          status: "active",
          isActive: true,
          maxEmployees: 50,
          hiddenPages: [],
          onboardingCompleted: true,
        },
      })
    : await prisma.company.create({
        data: {
          name: "PayNest Demo Company",
          slug: DEMO_SLUG,
          status: "active",
          isActive: true,
          maxEmployees: 50,
          hiddenPages: [],
          onboardingCompleted: true,
        },
      });

  await resetDemoTenant(company.id);
  return company;
}

async function createUsers(companyId: number) {
  const password = await bcrypt.hash(demoPassword, 12);
  for (const user of demoUsers) {
    await prisma.user.create({
      data: {
        ...user,
        companyId,
        password,
        isActive: true,
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
      },
    });
  }
}

async function seedCompany(companyId: number) {
  await prisma.companySettings.create({
    data: {
      companyId,
      companyName: "PayNest Demo Company",
      systemMode: "daily",
      calcMode: "daily",
      language: "en",
      reqHours: 8,
      monthDays: 26,
      lateTolerance: 10,
      workdays: "Sun,Mon,Tue,Wed,Thu",
      deductionRate: 1,
      extraRate: 1.25,
      workStartTime: "09:00",
      timezone: "Asia/Amman",
      brandColor: "#0f766e",
      emailFromName: "PayNest Demo",
      replyTo: `hr@${DEMO_EMAIL_DOMAIN}`,
    },
  });

  await prisma.employee.createMany({
    data: [
      {
        companyId,
        employeeId: "DEMO-OWN",
        name: "Demo Owner",
        email: `owner@${DEMO_EMAIL_DOMAIN}`,
        phone: "+962790000001",
        baseSalary: 0,
        socialSecurity: false,
        systemMode: "daily",
        workType: "standard",
        jobTitle: "Founder",
        department: "Leadership",
        joinDate: dateOnly("2025-01-05"),
        contractEndDate: addDays(today, 120),
      },
      {
        companyId,
        employeeId: "DEMO-HR",
        name: "Demo HR Manager",
        email: `hr@${DEMO_EMAIL_DOMAIN}`,
        phone: "+962790000002",
        baseSalary: 2100,
        socialSecurity: true,
        systemMode: "daily",
        workType: "standard",
        jobTitle: "HR Manager",
        department: "People",
        joinDate: dateOnly("2025-02-01"),
        contractEndDate: addDays(today, 45),
      },
      ...employees.map((employee, index) => ({
        companyId,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        baseSalary: employee.salary,
        socialSecurity: employee.socialSecurity,
        systemMode: "daily",
        workType: "standard",
        jobTitle: employee.title,
        department: employee.department,
        joinDate: dateOnly(`2025-0${Math.min(index + 2, 9)}-0${Math.min(index + 3, 9)}`),
        contractEndDate: addDays(today, 20 + index * 35),
      })),
    ],
  });

  const hrRecord = await prisma.employee.findFirst({
    where: { companyId, employeeId: "DEMO-HR" },
    select: { id: true },
  });
  if (hrRecord) {
    await prisma.employee.updateMany({
      where: { companyId, employeeId: { in: employees.map((employee) => employee.employeeId) } },
      data: { supervisorId: hrRecord.id },
    });
  }

  await prisma.leaveBalance.createMany({
    data: employees.map((employee, index) => ({
      companyId,
      employeeId: employee.employeeId,
      year: periodYear,
      annualTotal: 14,
      annualUsed: index % 2 === 0 ? 2 : 0,
      sickTotal: 14,
      sickUsed: index === 3 ? 1 : 0,
    })),
  });

  await prisma.attendanceRecord.createMany({
    data: employees.flatMap((employee, employeeIndex) =>
      Array.from({ length: 8 }, (_, dayIndex) => {
        const workDate = addDays(today, -10 + dayIndex);
        const late = employeeIndex === 2 && dayIndex === 4;
        const shortDay = employeeIndex === 4 && dayIndex === 6;
        return {
          companyId,
          employeeId: employee.employeeId,
          workDate,
          clockIn: timeOnly(late ? "09:22" : "08:58"),
          clockOut: timeOnly(shortDay ? "15:45" : "17:03"),
          hoursWorked: shortDay ? 6.75 : late ? 7.65 : 8.08,
          uploadBatch: "demo-attendance",
          systemMode: "daily",
        };
      }),
    ),
  });

  await prisma.payrollRecord.createMany({
    data: employees.map((employee, index) => {
      const adjustment = index === 2 ? -35 : index === 4 ? -95 : 0;
      const bonusTotal = index === 3 ? 120 : index === 0 ? 80 : 0;
      const deductionTotal = index === 4 ? 50 : 0;
      return {
        companyId,
        employeeId: employee.employeeId,
        periodMonth,
        periodYear,
        baseSalary: employee.salary,
        totalHours: index === 4 ? 58 : 64,
        requiredHours: 64,
        hourDiff: index === 4 ? -6 : 0,
        adjustment,
        socialSecurityDeduct: employee.socialSecurity ? Math.round(employee.salary * 0.075 * 100) / 100 : 0,
        bonusTotal,
        deductionTotal,
        netSalary: employee.salary + adjustment + bonusTotal - deductionTotal,
        status: "calculated",
        systemMode: "daily",
        dailyBreakdown: {
          source: "demo",
          period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
        },
      };
    }),
  });

  await prisma.bonusDeduction.createMany({
    data: [
      {
        companyId,
        employeeId: "DEMO-001",
        employeeName: "Lina Haddad",
        type: "bonus",
        reason: "Quarterly onboarding excellence",
        amount: 80,
        periodMonth,
        periodYear,
        systemMode: "daily",
      },
      {
        companyId,
        employeeId: "DEMO-005",
        employeeName: "Sara Mansour",
        type: "deduction",
        reason: "Equipment installment",
        amount: 50,
        periodMonth,
        periodYear,
        systemMode: "daily",
      },
    ],
  });

  await prisma.leaveRequest.createMany({
    data: [
      {
        companyId,
        employeeId: "DEMO-003",
        employeeName: "Maya Nasser",
        leaveType: "annual",
        startDate: addDays(today, 7),
        endDate: addDays(today, 8),
        daysCount: 2,
        reason: "Family travel",
        supervisorStatus: "approved",
        hrStatus: "pending",
        status: "pending",
      },
      {
        companyId,
        employeeId: "DEMO-004",
        employeeName: "Yousef Karim",
        leaveType: "sick",
        startDate: addDays(today, -3),
        endDate: addDays(today, -3),
        daysCount: 1,
        reason: "Medical appointment",
        supervisorStatus: "approved",
        hrStatus: "approved",
        status: "approved",
      },
    ],
  });

  await prisma.officialHoliday.createMany({
    data: [
      { companyId, name: "Demo Company Day", holidayDate: addDays(today, 14) },
      { companyId, name: "Founders Retreat", holidayDate: addDays(today, 45) },
    ],
  });

  await prisma.task.createMany({
    data: [
      {
        companyId,
        taskName: "Finalize July payroll review",
        employeeId: "DEMO-002",
        startDate: addDays(today, -2),
        deadline: addDays(today, 3),
        status: "in_progress",
        priority: "high",
        targetValue: 100,
        currentValue: 72,
        unit: "%",
        systemMode: "daily",
      },
      {
        companyId,
        taskName: "Prepare onboarding checklist",
        employeeId: "DEMO-001",
        startDate: addDays(today, -1),
        deadline: addDays(today, 5),
        status: "pending",
        priority: "medium",
        targetValue: 12,
        currentValue: 5,
        unit: "items",
        systemMode: "daily",
      },
    ],
  });

  await prisma.remoteAssignment.createMany({
    data: [
      {
        companyId,
        employeeId: "DEMO-003",
        startDate: addDays(today, 1),
        endDate: addDays(today, 2),
        label: "Client implementation sprint",
        note: "Remote work approved for delivery focus.",
      },
      {
        companyId,
        employeeId: "DEMO-005",
        startDate: addDays(today, 5),
        endDate: addDays(today, 5),
        label: "Customer workshop",
        note: "Remote support coverage.",
      },
    ],
  });

  await prisma.announcement.createMany({
    data: [
      {
        companyId,
        title: "Demo payroll cycle is ready",
        message: "Review attendance exceptions before approving payroll.",
        published: true,
        visibleToEmployees: true,
      },
      {
        companyId,
        title: "Quarterly performance reviews",
        message: "Managers should complete review notes by the end of the week.",
        published: true,
        visibleToEmployees: false,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        companyId,
        type: "payroll_ready",
        message: "Demo payroll has been calculated for the current period.",
        link: "/payroll",
      },
      {
        companyId,
        type: "contract_expiry",
        message: "Contract for Demo HR Manager ends soon. #DEMO-HR|demo",
        link: "/employees",
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        companyId,
        senderId: "DEMO-HR",
        receiverId: "DEMO-001",
        body: "Please review your leave balance before the payroll close.",
        read: false,
      },
      {
        companyId,
        senderId: "DEMO-001",
        receiverId: "DEMO-HR",
        body: "Reviewed. The current balance looks correct.",
        read: true,
      },
    ],
  });

  const equipmentRequestType = await prisma.requestType.create({
    data: {
      companyId,
      name: "Equipment Request",
      active: true,
      fields: [
        { key: "item", label: "Requested item", type: "text", required: true },
        { key: "reason", label: "Business reason", type: "textarea", required: true },
      ],
    },
  });

  await prisma.customRequest.create({
    data: {
      companyId,
      requestTypeId: equipmentRequestType.id,
      typeName: equipmentRequestType.name,
      employeeId: "DEMO-003",
      employeeName: "Maya Nasser",
      values: { item: "External monitor", reason: "Frontend QA and accessibility testing" },
      status: "pending",
    },
  });

  await prisma.advanceRequest.create({
    data: {
      companyId,
      employeeId: "DEMO-004",
      employeeName: "Yousef Karim",
      amount: 300,
      installments: 3,
      reason: "Short-term travel advance",
      status: "pending",
    },
  });

  await prisma.companyEvent.createMany({
    data: [
      { companyId, eventDate: addDays(today, 2), title: "Payroll review meeting" },
      { companyId, eventDate: addDays(today, 9), title: "HR policy walkthrough" },
    ],
  });

  const hrUser = await prisma.user.findFirst({ where: { companyId, role: "hr" }, select: { id: true } });
  if (hrUser) {
    await prisma.evaluation.createMany({
      data: employees.slice(0, 3).map((employee, index) => ({
        companyId,
        evaluatorId: hrUser.id,
        employeeId: employee.employeeId,
        periodMonth,
        periodYear,
        scoreAccuracy: index === 0 ? 5 : 4,
        scoreInnovation: index === 2 ? 5 : 4,
        scoreSpeed: 4,
        scoreDevelopment: 4,
        scoreQualityCheck: 5,
        scorePrioritization: 4,
        scoreIndependence: 4,
        scoreDeadlines: 5,
        scoreTeamwork: 5,
        scoreCommunication: 4,
        scoreKnowledgeSharing: 4,
        scoreFeedback: 5,
        scoreCompliance: 5,
        bonusWorthy: index === 0,
        bonusAmount: index === 0 ? 80 : 0,
        recommendations: "Demo performance review generated for sales walkthrough.",
      })),
    });
  }

  await prisma.auditLog.createMany({
    data: [
      {
        companyId,
        userId: 0,
        userName: "PayNest Demo Seeder",
        userRole: "system",
        action: "create",
        entity: "company",
        entityId: DEMO_SLUG,
        changes: { seeded: true, source: "seed-demo-company" },
      },
      {
        companyId,
        userId: 0,
        userName: "PayNest Demo Seeder",
        userRole: "system",
        action: "calculate",
        entity: "payroll",
        entityId: `${periodYear}-${periodMonth}`,
        changes: { employees: employees.length, source: "seed-demo-company" },
      },
    ],
  });
}

async function main() {
  const company = await ensureCompany();
  await createUsers(company.id);
  await seedCompany(company.id);
  await verifyDemoTenant(company.id);

  console.log("Seeded PayNest demo company.");
  console.log(`Company: PayNest Demo Company (${DEMO_SLUG})`);
  console.log(`Owner: owner@${DEMO_EMAIL_DOMAIN}`);
  console.log(`HR: hr@${DEMO_EMAIL_DOMAIN}`);
  console.log(`Employee: employee@${DEMO_EMAIL_DOMAIN}`);
  console.log(`Password: ${demoPassword}`);
}

async function verifyDemoTenant(companyId: number) {
  const [userCount, employeeCount, payrollCount, leaveCount, taskCount, messageCount] = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.employee.count({ where: { companyId } }),
    prisma.payrollRecord.count({ where: { companyId } }),
    prisma.leaveRequest.count({ where: { companyId } }),
    prisma.task.count({ where: { companyId } }),
    prisma.message.count({ where: { companyId } }),
  ]);

  const missing: string[] = [];
  if (userCount < 3) missing.push("owner/hr/employee users");
  if (employeeCount < employees.length + 2) missing.push("employee roster");
  if (payrollCount < employees.length) missing.push("payroll records");
  if (leaveCount < 2) missing.push("leave requests");
  if (taskCount < 2) missing.push("tasks");
  if (messageCount < 2) missing.push("messages");

  if (missing.length > 0) {
    throw new Error(`Demo seed verification failed. Missing: ${missing.join(", ")}`);
  }

  const users = await prisma.user.findMany({
    where: { companyId },
    select: { email: true },
  });
  const employeesWithEmails = await prisma.employee.findMany({
    where: { companyId },
    select: { email: true },
  });
  const unsafeEmails = [...users, ...employeesWithEmails]
    .map((row) => row.email)
    .filter((email): email is string => Boolean(email))
    .filter((email) => !email.endsWith(`@${DEMO_EMAIL_DOMAIN}`));

  if (unsafeEmails.length > 0) {
    throw new Error(`Demo seed contains non-demo email addresses: ${unsafeEmails.join(", ")}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
