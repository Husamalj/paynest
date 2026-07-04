import { expect, test } from "@playwright/test";
import { loginStaff, skipIfMissingCredentials } from "../helpers/auth";

test("owner can log in from the staff login page", async ({ page }) => {
  skipIfMissingCredentials("owner");

  await loginStaff(page, "owner");
  await expect(page.locator("body")).toBeVisible();
});

