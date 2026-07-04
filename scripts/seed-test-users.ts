import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertTestDatabase } from "./test-db-guard";
import { loadEnvFile } from "../tests/fixtures/env";

loadEnvFile(".env.test");

if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

if (!process.env.DIRECT_URL && process.env.TEST_DIRECT_URL) {
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL;
}

assertTestDatabase();

const prisma = new PrismaClient();

const TEST_PASSWORD = process.env.PAYNEST_TEST_PASSWORD || "Test123!";
const TEST_COMPANY_SLUG = "paynest-test-company";
const TEST_EMPLOYEE_NUMBER = "TEST-EMP-001";

const testUsers = {
  superAdmin: {
    email: process.env.PAYNEST_TEST_SUPER_ADMIN_EMAIL || "superadmin@test.com",
    password: process.env.PAYNEST_TEST_SUPER_ADMIN_PASSWORD || TEST_PASSWORD,
  },
  owner: {
    email: process.env.PAYNEST_TEST_OWNER_EMAIL || "owner@test.com",
    password: process.env.PAYNEST_TEST_OWNER_PASSWORD || TEST_PASSWORD,
  },
  hr: {
    email: process.env.PAYNEST_TEST_HR_EMAIL || "hr@test.com",
    password: process.env.PAYNEST_TEST_HR_PASSWORD || TEST_PASSWORD,
  },
  employee: {
    email: process.env.PAYNEST_TEST_EMPLOYEE_EMAIL || "employee@test.com",
    password: process.env.PAYNEST_TEST_EMPLOYEE_PASSWORD || TEST_PASSWORD,
  },
};

async function ensureCompany() {
  const existing = await prisma.company.findUnique({
    where: { slug: TEST_COMPANY_SLUG },
  });

  const data = {
    name: "PayNest Test Company",
    slug: TEST_COMPANY_SLUG,
    status: "active",
    isActive: true,
    maxEmployees: 25,
    hiddenPages: [],
    onboardingCompleted: true,
  };

  const company = existing
    ? await prisma.company.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.company.create({ data });

  const settings = await prisma.companySettings.findFirst({
    where: { companyId: company.id },
  });

  const settingsData = {
    companyId: company.id,
    companyName: company.name,
    systemMode: "daily",
    calcMode: "daily",
    language: "en",
    reqHours: 8,
    monthDays: 26,
    lateTolerance: 0,
    workdays: "Sun,Mon,Tue,Wed,Thu",
    deductionRate: 1,
    extraRate: 1,
    workStartTime: "09:00",
    timezone: "Asia/Amman",
  };

  if (settings) {
    await prisma.companySettings.update({
      where: { id: settings.id },
      data: settingsData,
    });
  } else {
    await prisma.companySettings.create({ data: settingsData });
  }

  return company;
}

async function ensureUser(data: {
  name: string;
  email: string;
  password: string;
  role: "super_admin" | "owner" | "hr" | "employee";
  companyId: number | null;
  employeeNumber?: string | null;
}) {
  const password = await bcrypt.hash(data.password, 10);
  const existing = await prisma.user.findFirst({
    where: { email: data.email },
  });

  const userData = {
    name: data.name,
    email: data.email,
    password,
    role: data.role,
    companyId: data.companyId,
    employeeNumber: data.employeeNumber ?? null,
    isActive: true,
    mustChangePassword: false,
    emailVerifiedAt: new Date(),
  };

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: userData,
    });
  }

  return prisma.user.create({ data: userData });
}

async function ensureEmployee(companyId: number) {
  return prisma.employee.upsert({
    where: {
      employeeId_companyId: {
        employeeId: TEST_EMPLOYEE_NUMBER,
        companyId,
      },
    },
    update: {
      name: "Test Employee",
      email: testUsers.employee.email,
      baseSalary: 2500,
      socialSecurity: false,
      systemMode: "daily",
      workType: "standard",
      jobTitle: "Test Employee",
      department: "QA",
    },
    create: {
      companyId,
      employeeId: TEST_EMPLOYEE_NUMBER,
      name: "Test Employee",
      email: testUsers.employee.email,
      baseSalary: 2500,
      phone: "0000000000",
      religion: "",
      socialSecurity: false,
      systemMode: "daily",
      workType: "standard",
      jobTitle: "Test Employee",
      department: "QA",
    },
  });
}

async function main() {
  const company = await ensureCompany();
  await ensureEmployee(company.id);

  await ensureUser({
    name: "Test Super Admin",
    email: testUsers.superAdmin.email,
    password: testUsers.superAdmin.password,
    role: "super_admin",
    companyId: null,
  });

  await ensureUser({
    name: "Test Owner",
    email: testUsers.owner.email,
    password: testUsers.owner.password,
    role: "owner",
    companyId: company.id,
    employeeNumber: "TEST-OWNER-001",
  });

  await ensureUser({
    name: "Test HR",
    email: testUsers.hr.email,
    password: testUsers.hr.password,
    role: "hr",
    companyId: company.id,
    employeeNumber: "TEST-HR-001",
  });

  await ensureUser({
    name: "Test Employee",
    email: testUsers.employee.email,
    password: testUsers.employee.password,
    role: "employee",
    companyId: company.id,
    employeeNumber: TEST_EMPLOYEE_NUMBER,
  });

  console.log("Seeded fake PayNest test users:");
  console.log(`- super_admin: ${testUsers.superAdmin.email}`);
  console.log(`- owner: ${testUsers.owner.email}`);
  console.log(`- hr: ${testUsers.hr.email}`);
  console.log(`- employee: ${testUsers.employee.email}`);
  console.log(`Company: ${company.name} (${company.slug})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
