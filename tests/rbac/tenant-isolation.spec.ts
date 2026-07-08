import { expect, test } from "@playwright/test";
import { authHeaderForSeededRole } from "../helpers/seededData";
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
  });
});
