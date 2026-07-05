import { expect, type Page, test } from "@playwright/test";
import { TEST_ACCOUNTS } from "../fixtures/accounts";

type Role = "employee" | "hr" | "owner" | "superAdmin";

type Credentials = {
  email: string;
  password: string;
};

const ENV_KEYS: Record<Role, { email: string; password: string }> = {
  employee: { email: "PAYNEST_TEST_EMPLOYEE_EMAIL", password: "PAYNEST_TEST_EMPLOYEE_PASSWORD" },
  hr: { email: "PAYNEST_TEST_HR_EMAIL", password: "PAYNEST_TEST_HR_PASSWORD" },
  owner: { email: "PAYNEST_TEST_OWNER_EMAIL", password: "PAYNEST_TEST_OWNER_PASSWORD" },
  superAdmin: { email: "PAYNEST_TEST_SUPER_ADMIN_EMAIL", password: "PAYNEST_TEST_SUPER_ADMIN_PASSWORD" },
};

export function credentialsFor(role: Role): Credentials | null {
  const keys = ENV_KEYS[role];
  const defaults: Record<Role, Credentials> = {
    employee: TEST_ACCOUNTS.alphaEmployee,
    hr: TEST_ACCOUNTS.alphaHr,
    owner: TEST_ACCOUNTS.alphaOwner,
    superAdmin: TEST_ACCOUNTS.superAdmin,
  };
  const email = process.env[keys.email] || defaults[role].email;
  const password = process.env[keys.password] || defaults[role].password;
  return { email, password };
}

export function skipIfMissingCredentials(role: Role) {
  const keys = ENV_KEYS[role];
  test.skip(
    process.env.PAYNEST_TEST_DB_READY !== "true",
    "Auth E2E tests are skipped until the local PostgreSQL test database is ready"
  );
  test.skip(
    !credentialsFor(role),
    `Missing ${keys.email}/${keys.password} in .env.test`
  );
}

export async function loginEmployee(page: Page) {
  const credentials = credentialsFor("employee");
  if (!credentials) throw new Error("Missing employee test credentials");

  await page.goto("/employee-login");
  await page.getByTestId("employee-login-email").fill(credentials.email);
  await page.getByTestId("employee-login-password").fill(credentials.password);
  await page.getByTestId("employee-login-submit").click();
  await expect(page).toHaveURL(/\/employee-portal$/);
}

export async function loginStaff(page: Page, role: Exclude<Role, "employee">) {
  const credentials = credentialsFor(role);
  if (!credentials) throw new Error(`Missing ${role} test credentials`);

  const expectedUrl: Record<Exclude<Role, "employee">, RegExp> = {
    hr: /\/dashboard$/,
    owner: /\/owner-portal$/,
    superAdmin: /\/super-admin$/,
  };

  await page.goto("/login");
  await page.getByTestId("staff-login-email").fill(credentials.email);
  await page.getByTestId("staff-login-password").fill(credentials.password);
  await page.getByTestId("staff-login-submit").click();
  await expect(page).toHaveURL(expectedUrl[role]);
}

export async function logoutFromSuperAdmin(page: Page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/);
}
