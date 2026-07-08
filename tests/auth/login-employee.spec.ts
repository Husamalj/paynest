import { expect, test } from "@playwright/test";
import { loginEmployee, skipIfMissingCredentials } from "../helpers/auth";

test("employee can log in from the employee login page", async ({ page }) => {
  skipIfMissingCredentials("employee");

  await loginEmployee(page);
  await expect(page.locator("body")).toContainText(/Employee Portal|Payslip|Tasks|Requests|Alpha Employee|رصيد الإجازة|مهامي/i);
});
