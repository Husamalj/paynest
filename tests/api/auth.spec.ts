import { expect, test } from "@playwright/test";
import { credentialsFor } from "../helpers/auth";
import { skipUntilTestDatabaseReady } from "../helpers/tokens";

test.describe("auth API", () => {
  test("login rejects missing credentials without touching seeded users", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: "", password: "" },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Email and password required" });
  });

  test("login accepts the seeded owner credentials", async ({ request }) => {
    test.skip(skipUntilTestDatabaseReady(), "Requires seeded local PostgreSQL test database");
    const credentials = credentialsFor("owner");
    test.skip(!credentials, "Missing owner credentials in .env.test");

    const response = await request.post("/api/auth/login", { data: credentials! });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { email: credentials!.email, role: "owner" },
    });
  });
});
