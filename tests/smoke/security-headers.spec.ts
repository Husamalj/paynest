import { expect, test } from "@playwright/test";

const expectedHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-permitted-cross-domain-policies": "none",
  "referrer-policy": "strict-origin-when-cross-origin",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
};

test("homepage sends baseline security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBeLessThan(400);

  for (const [header, value] of Object.entries(expectedHeaders)) {
    expect(response.headers()[header]).toBe(value);
  }

  const csp = response.headers()["content-security-policy"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
});

test("API responses are not cached", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBeLessThan(500);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
