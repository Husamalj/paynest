import { PrismaClient } from "@prisma/client";
import { TEST_ACCOUNTS } from "../fixtures/accounts";
import { authHeaderFor } from "./tokens";

const prisma = new PrismaClient();

type SeededAccount = "alphaOwner" | "alphaHr" | "alphaEmployee" | "betaOwner" | "betaEmployee";
type SeededRole = "owner" | "hr" | "employee";

const accountByRole = {
  owner: TEST_ACCOUNTS.alphaOwner,
  hr: TEST_ACCOUNTS.alphaHr,
  employee: TEST_ACCOUNTS.alphaEmployee,
} as const;

const roleByAccount = {
  alphaOwner: "owner",
  alphaHr: "hr",
  alphaEmployee: "employee",
  betaOwner: "owner",
  betaEmployee: "employee",
} as const;

export async function authHeaderForSeededRole(role: SeededRole) {
  const account = accountByRole[role];
  return authHeaderForSeededAccount(role === "owner" ? "alphaOwner" : role === "hr" ? "alphaHr" : "alphaEmployee", account.email);
}

export async function authHeaderForSeededAccount(accountName: SeededAccount, email = TEST_ACCOUNTS[accountName].email) {
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, companyId: true, employeeNumber: true },
  });

  if (!user) {
    throw new Error(`Seeded ${accountName} user was not found. Run npm run test:prepare first.`);
  }

  return authHeaderFor(roleByAccount[accountName], {
    id: user.id,
    email,
    companyId: user.companyId,
    employeeNumber: user.employeeNumber,
  });
}
