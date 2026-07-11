import { expect, test } from "@playwright/test";
import { loginEmployee, loginStaff, skipIfMissingCredentials } from "../helpers/auth";

test.describe("page access RBAC", () => {
  test("HR cannot open the super admin dashboard", async ({ page }) => {
    skipIfMissingCredentials("hr");

    await loginStaff(page, "hr");
    await page.goto("/super-admin");

    await expect(page).toHaveURL(/\/$/);
  });

  test("owner cannot open the super admin dashboard", async ({ page }) => {
    skipIfMissingCredentials("owner");

    await loginStaff(page, "owner");
    await page.goto("/super-admin");

    await expect(page).toHaveURL(/\/$/);
  });

  test("employee cannot open the HR dashboard", async ({ page }) => {
    skipIfMissingCredentials("employee");

    await loginEmployee(page);
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/$/);
  });
});
