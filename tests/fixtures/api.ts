import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { TEST_ACCOUNTS } from "./accounts";

export type TestAccount = keyof typeof TEST_ACCOUNTS;

export async function loginRequest(request: APIRequestContext, account: TestAccount) {
  const credentials = TEST_ACCOUNTS[account];
  const response = await request.post("/api/auth/login", {
    data: { email: credentials.email, password: credentials.password },
  });
  return response;
}

export async function authHeaders(request: APIRequestContext, account: TestAccount) {
  const response = await loginRequest(request, account);
  const body = await response.json();
  return { Authorization: `Bearer ${body.token}` };
}

export async function loginPageByApi(page: Page, account: TestAccount) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: TEST_ACCOUNTS[account].email, password: TEST_ACCOUNTS[account].password },
  });
  const body = await response.json();
  if (!response.ok()) throw new Error(`Login failed for ${account}: ${JSON.stringify(body)}`);
  await page.addInitScript(({ user }) => {
    window.localStorage.setItem("paynest_logged_in", "true");
    window.localStorage.setItem("role", user.role);
    window.localStorage.setItem("user", JSON.stringify(user));
  }, { user: body.user });
}

export async function saveStorageState(context: BrowserContext, path: string) {
  await context.storageState({ path });
}

