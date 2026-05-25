import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const assignments = await prisma.remoteAssignment.findMany({
      where: {
        companyId: session.companyId,
        endDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
      include: {
        company: { select: { id: true } },
      },
    });

    // Enrich with employee name/base_salary
    const empIds = Array.from(new Set(assignments.map((a) => a.employeeId)));
    const employees = await prisma.employee.findMany({
      where: { employeeId: { in: empIds }, companyId: session.companyId },
      select: { employeeId: true, name: true, baseSalary: true },
    });
    const empMap: Record<string, any> = {};
    for (const e of employees) { if (e.employeeId) empMap[e.employeeId] = e; }

    return NextResponse.json(
      assignments.map((a) => ({
        ...a,
        name: empMap[a.employeeId]?.name ?? a.employeeId,
        emp_id: a.employeeId,
        base_salary: empMap[a.employeeId]?.baseSalary ?? 0,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}
