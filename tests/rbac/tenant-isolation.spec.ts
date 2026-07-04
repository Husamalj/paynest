import { test } from "@playwright/test";
import { skipUntilTestDatabaseReady } from "../helpers/tokens";

test.describe("tenant isolation", () => {
  test.skip(skipUntilTestDatabaseReady(), "Requires seeded local PostgreSQL test database");

  test("owner cannot read another company's employees", async () => {
    test.fixme(true, "Seed a second company and assert cross-tenant employee IDs are not returned.");
  });

  test("employee cannot read another employee's payroll records", async () => {
    test.fixme(true, "Seed multiple employees and assert /api/payroll/my is scoped to the session employee.");
  });
});
