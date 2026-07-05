import { PrismaClient } from "@prisma/client";
import { assertTestDatabase } from "./test-db-guard";
import { TEST_ACCOUNTS } from "../tests/fixtures/accounts";

const prisma = new PrismaClient();

const TEST_ACCOUNT_EMAILS = Object.values(TEST_ACCOUNTS).map((account) => account.email);

export async function resetTestData() {
  assertTestDatabase();

  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { slug: { startsWith: "test-" } },
        { slug: "paynest-test-company" },
      ],
    },
    select: { id: true },
  });
  const companyIds = companies.map((company) => company.id);

  if (companyIds.length > 0) {
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.notification.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.auditLog.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.customRequest.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.requestType.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.companyEvent.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.advanceRequest.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.announcement.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.jobOfferTemplate.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.jobOffer.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.evaluation.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.bonusTier.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.bonusDeduction.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.payrollRecord.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.monthlySalary.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.attendanceRecord.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.officialHoliday.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.leaveBalance.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.leaveRequest.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.remoteAssignment.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.employeeDocument.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.employee.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.uploadedFile.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.companySettings.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.user.deleteMany({ where: { companyId: { in: companyIds } } }),
      prisma.company.deleteMany({ where: { id: { in: companyIds } } }),
    ]);
  }

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { in: TEST_ACCOUNT_EMAILS } },
        { email: { endsWith: "@example.test" } },
      ],
    },
  });
  await prisma.contactRequest.deleteMany({ where: { email: { endsWith: "@example.test" } } });
}

if (require.main === module) {
  resetTestData()
    .finally(() => prisma.$disconnect())
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
