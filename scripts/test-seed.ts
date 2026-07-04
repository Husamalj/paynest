import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { resetTestData } from "./test-reset";
import { TEST_ACCOUNTS, TEST_COMPANIES, TEST_PASSWORD } from "../tests/fixtures/accounts";

const prisma = new PrismaClient();

const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);
const timeOnly = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
};

async function createUser(data: {
  name: string;
  email: string;
  role: string;
  companyId?: number | null;
  employeeNumber?: string | null;
}) {
  return prisma.user.create({
    data: {
      ...data,
      password: await bcrypt.hash(TEST_PASSWORD, 10),
      isActive: true,
      mustChangePassword: false,
    },
  });
}

async function main() {
  if (!process.env.NODE_ENV) Object.assign(process.env, { NODE_ENV: "test" });
  await resetTestData();

  const alpha = await prisma.company.create({
    data: { ...TEST_COMPANIES.alpha, status: "active", isActive: true, maxEmployees: 50 },
  });
  const beta = await prisma.company.create({
    data: { ...TEST_COMPANIES.beta, status: "active", isActive: true, maxEmployees: 50 },
  });

  await prisma.companySettings.createMany({
    data: [
      { companyId: alpha.id, companyName: alpha.name, systemMode: "daily", calcMode: "daily", reqHours: 8, monthDays: 26, workdays: "Sun,Mon,Tue,Wed,Thu", timezone: "Asia/Amman" },
      { companyId: beta.id, companyName: beta.name, systemMode: "daily", calcMode: "daily", reqHours: 8, monthDays: 26, workdays: "Sun,Mon,Tue,Wed,Thu", timezone: "Asia/Amman" },
    ],
  });

  await createUser({ name: "Test Super Admin", email: TEST_ACCOUNTS.superAdmin.email, role: "super_admin", companyId: null });
  await createUser({ name: "Alpha Owner", email: TEST_ACCOUNTS.alphaOwner.email, role: "owner", companyId: alpha.id, employeeNumber: "OWNER-A" });
  await createUser({ name: "Alpha HR", email: TEST_ACCOUNTS.alphaHr.email, role: "hr", companyId: alpha.id, employeeNumber: "HR-A" });
  await createUser({ name: "Alpha Employee", email: TEST_ACCOUNTS.alphaEmployee.email, role: "employee", companyId: alpha.id, employeeNumber: "A001" });
  await createUser({ name: "Beta Owner", email: TEST_ACCOUNTS.betaOwner.email, role: "owner", companyId: beta.id, employeeNumber: "OWNER-B" });
  await createUser({ name: "Beta Employee", email: TEST_ACCOUNTS.betaEmployee.email, role: "employee", companyId: beta.id, employeeNumber: "B001" });

  await prisma.employee.createMany({
    data: [
      { companyId: alpha.id, employeeId: "A001", name: "Alpha Employee", email: TEST_ACCOUNTS.alphaEmployee.email, baseSalary: 2600, socialSecurity: true, systemMode: "daily", workType: "standard" },
      { companyId: alpha.id, employeeId: "A002", name: "Alpha Second", email: "alpha.second@example.test", baseSalary: 2200, socialSecurity: false, systemMode: "daily", workType: "standard" },
      { companyId: beta.id, employeeId: "B001", name: "Beta Employee", email: TEST_ACCOUNTS.betaEmployee.email, baseSalary: 2400, socialSecurity: false, systemMode: "daily", workType: "standard" },
    ],
  });

  await prisma.leaveBalance.createMany({
    data: [
      { companyId: alpha.id, employeeId: "A001", year: 2026, annualTotal: 14, annualUsed: 0, sickTotal: 14, sickUsed: 0 },
      { companyId: beta.id, employeeId: "B001", year: 2026, annualTotal: 14, annualUsed: 0, sickTotal: 14, sickUsed: 0 },
    ],
  });

  await prisma.leaveRequest.create({
    data: {
      companyId: alpha.id,
      employeeId: "A001",
      employeeName: "Alpha Employee",
      leaveType: "annual",
      startDate: dateOnly("2026-06-10"),
      endDate: dateOnly("2026-06-10"),
      daysCount: 1,
      supervisorStatus: "approved",
      hrStatus: "approved",
      status: "approved",
    },
  });

  await prisma.attendanceRecord.createMany({
    data: [
      { companyId: alpha.id, employeeId: "A001", workDate: dateOnly("2026-06-01"), clockIn: timeOnly("09:00"), clockOut: timeOnly("17:00"), hoursWorked: 8, systemMode: "daily", uploadBatch: "test" },
      { companyId: alpha.id, employeeId: "A001", workDate: dateOnly("2026-06-02"), clockIn: timeOnly("09:00"), clockOut: timeOnly("16:00"), hoursWorked: 7, systemMode: "daily", uploadBatch: "test" },
      { companyId: beta.id, employeeId: "B001", workDate: dateOnly("2026-06-01"), clockIn: timeOnly("09:00"), clockOut: timeOnly("17:00"), hoursWorked: 8, systemMode: "daily", uploadBatch: "test" },
    ],
  });

  await prisma.bonusDeduction.create({
    data: { companyId: alpha.id, employeeId: "A001", employeeName: "Alpha Employee", type: "bonus", reason: "Test bonus", amount: 100, periodMonth: 6, periodYear: 2026, systemMode: "daily" },
  });

  await prisma.auditLog.create({
    data: { companyId: alpha.id, userId: 1, userName: "Test Seed", userRole: "system", action: "create", entity: "employee", entityId: "A001", changes: { source: "test-seed" } },
  });

  await prisma.contactRequest.create({
    data: { firstName: "Test", lastName: "Lead", email: "lead@example.test", company: "Example Test Co", teamSize: "10", message: "Seeded test lead" },
  });

  console.log("Seeded PayNest test data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
