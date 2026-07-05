export const TEST_PASSWORD = "Test123!";

export const TEST_ACCOUNTS = {
  superAdmin: { email: "superadmin@test.com", password: TEST_PASSWORD, role: "super_admin" },
  alphaOwner: { email: "owner@test.com", password: TEST_PASSWORD, role: "owner" },
  alphaHr: { email: "hr@test.com", password: TEST_PASSWORD, role: "hr" },
  alphaEmployee: { email: "employee@test.com", password: TEST_PASSWORD, role: "employee", employeeNumber: "A001" },
  betaOwner: { email: "owner.beta@example.test", password: TEST_PASSWORD, role: "owner" },
  betaEmployee: { email: "employee.beta@example.test", password: TEST_PASSWORD, role: "employee", employeeNumber: "B001" },
} as const;

export const TEST_COMPANIES = {
  alpha: { name: "Test Alpha Company", slug: "test-alpha" },
  beta: { name: "Test Beta Company", slug: "test-beta" },
} as const;
