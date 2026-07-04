import { expect, test } from "@playwright/test";
import { authHeaderFor } from "../helpers/tokens";

test.describe("API RBAC guardrails", () => {
  test("employee cannot read the company employee directory", async ({ request }) => {
    const response = await request.get("/api/employees", {
      headers: authHeaderFor("employee"),
    });

    expect(response.status()).toBe(403);
  });

  test("employee cannot read audit logs", async ({ request }) => {
    const response = await request.get("/api/audit-log", {
      headers: authHeaderFor("employee"),
    });

    expect(response.status()).toBe(403);
  });

  test("employee cannot calculate payroll", async ({ request }) => {
    const response = await request.post("/api/payroll/calculate", {
      headers: authHeaderFor("employee"),
      data: { month: 6, year: 2026 },
    });

    expect(response.status()).toBe(403);
  });

  test("platform super admin cannot use company-scoped APIs without a company scope", async ({ request }) => {
    const response = await request.get("/api/employees", {
      headers: authHeaderFor("super_admin"),
    });

    expect(response.status()).toBe(403);
  });
});
