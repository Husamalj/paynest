import { expect, test } from "@playwright/test";
import { loginStaff, skipIfMissingCredentials } from "../helpers/auth";

test("HR can log in from the staff login page", async ({ page }) => {
  skipIfMissingCredentials("hr");

  await loginStaff(page, "hr");
  await expect(page.locator("body")).toBeVisible();
});

