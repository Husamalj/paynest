import { expect, test } from "@playwright/test";
import { loginStaff, skipIfMissingCredentials } from "../helpers/auth";

test("super admin can log in from the staff login page", async ({ page }) => {
  skipIfMissingCredentials("superAdmin");

  await loginStaff(page, "superAdmin");
  await expect(page.locator("body")).toContainText(/CEO Dashboard|Add Company/i);
});

