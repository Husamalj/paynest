import { expect, test } from "@playwright/test";
import { authHeaderFor, skipUntilTestDatabaseReady } from "../helpers/tokens";
import { authHeaderForSeededRole } from "../helpers/seededData";

const protectedGetEndpoints = [
  "/api/auth/me",
  "/api/employees",
  "/api/attendance",
  "/api/leaves",
  "/api/payroll/latest",
  "/api/payroll/my",
  "/api/audit-log",
];

test.describe("protected API skeleton", () => {
  for (const endpoint of protectedGetEndpoints) {
    test(`GET ${endpoint} rejects missing auth`, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    });
  }

  test("employee can submit a structurally invalid leave request and receive validation", async ({ request }) => {
    const response = await request.post("/api/leaves", {
      headers: authHeaderFor("employee"),
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test("owner can list employees", async ({ request }) => {
    test.skip(skipUntilTestDatabaseReady(), "Requires seeded local PostgreSQL test database");

    const response = await request.get("/api/employees", {
      headers: await authHeaderForSeededRole("owner"),
    });

    expect(response.status()).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  test("employee attendance response is scoped to their own employee number", async ({ request }) => {
    test.skip(skipUntilTestDatabaseReady(), "Requires seeded local PostgreSQL test database");

    const response = await request.get("/api/attendance?employee_id=SOMEONE-ELSE&month=6&year=2026", {
      headers: await authHeaderForSeededRole("employee"),
    });

    expect(response.status()).toBe(200);
    const rows = await response.json();
    expect(rows.every((row: { employee_id: string }) => row.employee_id === "A001")).toBe(true);
  });

  test("owner can read audit logs", async ({ request }) => {
    test.skip(skipUntilTestDatabaseReady(), "Requires seeded local PostgreSQL test database");

    const response = await request.get("/api/audit-log", {
      headers: await authHeaderForSeededRole("owner"),
    });

    expect(response.status()).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });
});
