export function assertTestDatabase() {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
  const nodeEnv = process.env.NODE_ENV;
  const allow = process.env.PAYNEST_ALLOW_TEST_DB === "true";
  const clearlyTest = /test|localhost|127\.0\.0\.1|postgres:5432/i.test(url);

  if (!url) {
    throw new Error("DATABASE_URL or TEST_DATABASE_URL is required for test data setup.");
  }

  if (nodeEnv !== "test" && !allow) {
    throw new Error("Refusing to mutate data unless NODE_ENV=test or PAYNEST_ALLOW_TEST_DB=true.");
  }

  if (!clearlyTest && !allow) {
    throw new Error("Refusing to mutate a database URL that does not look like a local/test database.");
  }
}

