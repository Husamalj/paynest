import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";
import { hiddenPageAliases } from "@/lib/responseShape";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: { select: { role: true, employeeNumber: true, email: true } },
      },
    });

    // For each company: count employees excluding only owner/super_admin (HR counts)
    const results = await Promise.all(
      companies.map(async (c: any) => {
        const adminEmpNums = c.users
          .filter((u: any) => u.role === "owner" || u.role === "super_admin")
          .map((u: any) => u.employeeNumber)
          .filter(Boolean) as string[];

        const employee_count = await prisma.employee.count({
          where: {
            companyId: c.id,
            ...(adminEmpNums.length > 0 ? { NOT: { employeeId: { in: adminEmpNums } } } : {}),
          },
        });

        const owner_email = c.users.find((u: any) => u.role === "owner")?.email ?? null;

        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          status: c.status,
          is_active: c.isActive,
          isActive: c.isActive,
          createdAt: c.createdAt,
          created_at: c.createdAt,
          employee_count,
          max_employees: c.maxEmployees,
          maxEmployees: c.maxEmployees,
          ...hiddenPageAliases(c),
          owner_email,
        };
      })
    );

    return NextResponse.json(results);
  } catch (err) {
    return errorResponse(err);
  }
}
