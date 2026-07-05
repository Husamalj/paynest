import jwt from "jsonwebtoken";
import { TEST_ACCOUNTS } from "../fixtures/accounts";

type TestRole = "super_admin" | "owner" | "hr" | "employee";

export function authHeaderFor(role: TestRole, overrides: Record<string, unknown> = {}) {
  const accountByRole = {
    super_admin: TEST_ACCOUNTS.superAdmin,
    owner: TEST_ACCOUNTS.alphaOwner,
    hr: TEST_ACCOUNTS.alphaHr,
    employee: TEST_ACCOUNTS.alphaEmployee,
  } as const;
  const account = accountByRole[role];

  const payload = {
    id: role === "super_admin" ? 1 : role === "owner" ? 2 : role === "hr" ? 3 : 4,
    name: `Test ${role}`,
    email: account.email,
    role,
    companyId: role === "super_admin" ? null : 1,
    employeeNumber: "employeeNumber" in account ? account.employeeNumber : null,
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
