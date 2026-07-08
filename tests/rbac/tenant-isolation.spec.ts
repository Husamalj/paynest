import { expect, test } from "@playwright/test";
import { authHeaderForSeededAccount, authHeaderForSeededRole } from "../helpers/seededData";
import { skipUntilTestDatabaseReady } from "../helpers/tokens";

test.describe("tenant isolation", () => {
  test.skip(skipUntilTestDatabaseReady(), "Requires seeded local PostgreSQL test database");

  test("owner cannot read another company's employees", async ({ request }) => {
    const response = await request.get("/api/employees", {
      headers: await authHeaderForSeededRole("owner"),
    });

    expect(response.status()).toBe(200);
    const employees = await response.json();
    const employeeIds = employees.map((employee: { employee_id?: string }) => employee.employee_id);

    expect(employeeIds).toContain("A001");
    expect(employeeIds).toContain("A002");
    expect(employeeIds).not.toContain("B001");
    expect(JSON.stringify(employees)).not.toContain("Beta Employee");
  });

  test("employee cannot read another employee's payroll records", async ({ request }) => {
    const response = await request.get("/api/payroll/my", {
      headers: await authHeaderForSeededRole("employee"),
    });

    expect(response.status()).toBe(200);
    const records = await response.json();
    const netSalaries = records.map((record: { net_salary?: number | string }) => Number(record.net_salary));

    expect(netSalaries).toContain(2600);
    expect(netSalaries).not.toContain(2200);
    expect(netSalaries).not.toContain(2400);
    expect(netSalaries).not.toContain(9999);
  });

  test("same employee numbers do not leak across employee-scoped lists", async ({ request }) => {
    const alphaOwner = await authHeaderForSeededAccount("alphaOwner");

    const [attendance, leaves, payroll, bonuses, audit] = await Promise.all([
      request.get("/api/attendance?employee_id=A001&month=6&year=2026", { headers: alphaOwner }),
      request.get("/api/leaves", { headers: alphaOwner }),
      request.get("/api/payroll/latest", { headers: alphaOwner }),
      request.get("/api/bonuses?month=6&year=2026", { headers: alphaOwner }),
      request.get("/api/audit-log", { headers: alphaOwner }),
    ]);

    for (const response of [attendance, leaves, payroll, bonuses, audit]) {
      expect(response.status()).toBe(200);
    }

    const body = JSON.stringify({
      attendance: await attendance.json(),
      leaves: await leaves.json(),
      payroll: await payroll.json(),
      bonuses: await bonuses.json(),
      audit: await audit.json(),
    });

    expect(body).toContain("Alpha Employee");
    expect(body).not.toContain("Beta Shared Id");
    expect(body).not.toContain("Beta Secret Bonus");
    expect(body).not.toContain("beta-secret");
    expect(body).not.toContain("9999");
  });

  test("leave balance updates are scoped by company plus employee plus year", async ({ request }) => {
    const alphaOwner = await authHeaderForSeededAccount("alphaOwner");
    const betaOwner = await authHeaderForSeededAccount("betaOwner");

    const update = await request.put("/api/leaves/balances", {
      headers: alphaOwner,
      data: {
        employee_id: "A001",
        year: 2026,
        annual_total: 18,
        annual_used: 2,
        sick_total: 12,
        sick_used: 1,
      },
    });
    expect(update.status()).toBe(200);

    const [alphaResponse, betaResponse] = await Promise.all([
      request.get("/api/leaves/balances?year=2026", { headers: alphaOwner }),
      request.get("/api/leaves/balances?year=2026", { headers: betaOwner }),
    ]);
    expect(alphaResponse.status()).toBe(200);
    expect(betaResponse.status()).toBe(200);

    const alphaRows = await alphaResponse.json();
    const betaRows = await betaResponse.json();
    const alphaA001 = alphaRows.find((row: { employee_id?: string }) => row.employee_id === "A001");
    const betaA001 = betaRows.find((row: { employee_id?: string; name?: string }) => row.employee_id === "A001" && row.name === "Beta Shared Id");

    expect(alphaA001).toMatchObject({ annual_total: 18, annual_used: 2, sick_total: 12, sick_used: 1 });
    expect(betaA001).toMatchObject({ annual_total: 20, annual_used: 5, sick_total: 10, sick_used: 1 });
  });

  test("same holiday dates and remote assignments are isolated per company", async ({ request }) => {
    const alphaOwner = await authHeaderForSeededAccount("alphaOwner");
    const betaOwner = await authHeaderForSeededAccount("betaOwner");

    const [alphaHolidays, betaHolidays, alphaRemote, betaRemote] = await Promise.all([
      request.get("/api/leaves/holidays", { headers: alphaOwner }),
      request.get("/api/leaves/holidays", { headers: betaOwner }),
      request.get("/api/employees/A001/remote-assignments", { headers: alphaOwner }),
      request.get("/api/employees/A001/remote-assignments", { headers: betaOwner }),
    ]);

    for (const response of [alphaHolidays, betaHolidays, alphaRemote, betaRemote]) {
      expect(response.status()).toBe(200);
    }

    const alphaHolidayBody = JSON.stringify(await alphaHolidays.json());
    const betaHolidayBody = JSON.stringify(await betaHolidays.json());
    const alphaRemoteBody = JSON.stringify(await alphaRemote.json());
    const betaRemoteBody = JSON.stringify(await betaRemote.json());

    expect(alphaHolidayBody).toContain("Alpha Founders Day");
    expect(alphaHolidayBody).not.toContain("Beta Founders Day");
    expect(betaHolidayBody).toContain("Beta Founders Day");
    expect(betaHolidayBody).not.toContain("Alpha Founders Day");

    expect(alphaRemoteBody).toContain("Alpha Remote");
    expect(alphaRemoteBody).not.toContain("Beta Remote");
    expect(betaRemoteBody).toContain("Beta Remote");
    expect(betaRemoteBody).not.toContain("Alpha Remote");
  });
});
