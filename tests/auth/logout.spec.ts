import { test } from "@playwright/test";
import { loginStaff, logoutFromSuperAdmin, skipIfMissingCredentials } from "../helpers/auth";

test("super admin can log out", async ({ page }) => {
  skipIfMissingCredentials("superAdmin");

  await loginStaff(page, "superAdmin");
  await logoutFromSuperAdmin(page);
});

