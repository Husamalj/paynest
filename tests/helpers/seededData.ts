import { PrismaClient } from "@prisma/client";
import { TEST_ACCOUNTS } from "../fixtures/accounts";
import { authHeaderFor } from "./tokens";

const prisma = new PrismaClient();

type SeededRole = "owner" | "hr" | "employee";

const accountByRole = {
  owner: TEST_ACCOUNTS.alphaOwner,
  hr: TEST_ACCOUNTS.alphaHr,
  employee: TEST_ACCOUNTS.alphaEmployee,
} as const;

export async function authHeaderForSeededRole(role: SeededRole) {
  const account = accountByRole[role];
  const user = await prisma.user.findFirst({
    where: { email: account.email },
    select: { id: true, companyId: true, employeeNumber: true },
  });

  if (!user) {
    throw new Error(`Seeded ${role} user was not found. Run npm run test:prepare first.`);
  }

  return authHeaderFor(role, {
    id: user.id,
    companyId: user.companyId,
    employeeNumber: user.employeeNumber,
  });
}
