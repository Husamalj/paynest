import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { authHeaderFor, skipUntilTestDatabaseReady } from "../helpers/tokens";

const prisma = new PrismaClient();
const FLOW_PASSWORD = "FlowTest123!";

test.describe("customer full flow", () => {
  test.skip(skipUntilTestDatabaseReady(), "Requires seeded local/staging PostgreSQL test database");

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("signup to approval to HR, employee, attendance, payroll, leave, and messages", async ({ request }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const slug = `test-flow-${suffix}`;
    const ownerEmail = `paynest.flow.owner.${suffix}@gmail.com`;
    const hrEmail = `paynest.flow.hr.${suffix}@gmail.com`;
    const employeeEmail = `paynest.flow.employee.${suffix}@gmail.com`;
    const employeeId = `FLOW-${suffix.slice(-6).toUpperCase()}`;
    const hrEmployeeId = `FLOW-HR-${suffix.slice(-4).toUpperCase()}`;

    const signup = await request.post("/api/auth/register-company", {
      data: {
        companyName: "PayNest Flow Test Co",
        slug,
        ownerName: "Flow Owner",
        email: ownerEmail,
        password: FLOW_PASSWORD,
        maxEmployees: 20,
      },
    });
    expect(signup.status()).toBe(200);
    await expect(signup.json()).resolves.toMatchObject({ pending: true });

    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true, status: true, isActive: true },
    });
    expect(company).toMatchObject({ status: "pending", isActive: false });

    const approval = await request.patch(`/api/companies/${company!.id}/approve`, {
      headers: authHeaderFor("super_admin"),
    });
    expect(approval.status()).toBe(200);

    const ownerLogin = await request.post("/api/auth/login", {
      data: { email: ownerEmail, password: FLOW_PASSWORD },
    });
    expect(ownerLogin.status()).toBe(200);
    const ownerBody = await ownerLogin.json();
    expect(ownerBody.user).toMatchObject({ email: ownerEmail, role: "owner", companyId: company!.id });
    const ownerHeaders = { Authorization: `Bearer ${ownerBody.token}` };

    const createHr = await request.post("/api/auth/create-hr", {
      headers: ownerHeaders,
      data: {
        name: "Flow HR",
        email: hrEmail,
        password: FLOW_PASSWORD,
        employee_number: hrEmployeeId,
        base_salary: 2100,
      },
    });
    expect(createHr.status()).toBe(201);

    const hrLogin = await request.post("/api/auth/login", {
      data: { email: hrEmail, password: FLOW_PASSWORD },
    });
    expect(hrLogin.status()).toBe(200);
    const hrBody = await hrLogin.json();
    const hrHeaders = { Authorization: `Bearer ${hrBody.token}` };

    const createEmployee = await request.post("/api/employees", {
      headers: hrHeaders,
      data: {
        employee_id: employeeId,
        name: "Flow Employee",
        email: employeeEmail,
        base_salary: 1800,
        social_security: true,
        job_title: "Implementation Specialist",
        department: "Delivery",
      },
    });
    expect(createEmployee.status()).toBe(200);

    const workDate = "2026-06-15";
    const attendance = await request.post("/api/attendance/manual", {
      headers: hrHeaders,
      data: {
        employee_id: employeeId,
        work_date: workDate,
        clock_in: "09:00",
        clock_out: "17:00",
      },
    });
    expect(attendance.status()).toBe(200);

    const calculate = await request.post("/api/payroll/calculate", {
      headers: ownerHeaders,
      data: { month: 6, year: 2026 },
    });
    expect(calculate.status()).toBe(200);

    const latestPayroll = await request.get("/api/payroll/latest", { headers: ownerHeaders });
    expect(latestPayroll.status()).toBe(200);
    const payrollBody = await latestPayroll.json();
    expect(JSON.stringify(payrollBody)).toContain(employeeId);

    const employeeUser = await prisma.user.findFirst({
      where: { companyId: company!.id, employeeNumber: employeeId, role: "employee" },
      select: { id: true, name: true, email: true, employeeNumber: true },
    });
    expect(employeeUser).toBeTruthy();
    const employeeHeaders = authHeaderFor("employee", {
      id: employeeUser!.id,
      name: employeeUser!.name,
      email: employeeUser!.email,
      companyId: company!.id,
      employeeNumber: employeeId,
    });

    const leave = await request.post("/api/leaves", {
      headers: employeeHeaders,
      data: {
        employee_id: employeeId,
        employee_name: "Flow Employee",
        leave_type: "annual",
        start_date: "2026-06-22",
        end_date: "2026-06-22",
        days_count: 1,
        reason: "Flow test leave",
      },
    });
    expect(leave.status()).toBe(200);
    await expect(leave.json()).resolves.toMatchObject({
      companyId: company!.id,
      employeeId,
      status: "pending",
    });

    const sendMessage = await request.post("/api/messages", {
      headers: employeeHeaders,
      data: {
        to: hrEmployeeId,
        body: "Flow test message to HR",
      },
    });
    expect(sendMessage.status()).toBe(200);

    const readThread = await request.get(`/api/messages?with=${employeeId}`, { headers: hrHeaders });
    expect(readThread.status()).toBe(200);
    expect(JSON.stringify(await readThread.json())).toContain("Flow test message to HR");
  });
});
