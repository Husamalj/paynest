import { expect, test } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("404");
});

test("portal selection page loads successfully", async ({ page }) => {
  await page.goto("/portal-select");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("404");
});

