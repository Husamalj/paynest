import jwt from "jsonwebtoken";

type TestRole = "super_admin" | "owner" | "hr" | "employee";

export function authHeaderFor(role: TestRole, overrides: Record<string, unknown> = {}) {
  const payload = {
    id: role === "super_admin" ? 1 : role === "owner" ? 2 : role === "hr" ? 3 : 4,
    name: `Test ${role}`,
    email: `${role.replace("_", "")}@test.com`,
    role,
    companyId: role === "super_admin" ? null : 1,
    employeeNumber: role === "employee" ? "TEST-EMP-001" : null,
    ...overrides,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || "test-jwt-secret-change-me", {
    expiresIn: "1h",
  });

  return { Authorization: `Bearer ${token}` };
}

export function skipUntilTestDatabaseReady() {
  return process.env.PAYNEST_TEST_DB_READY !== "true";
}
