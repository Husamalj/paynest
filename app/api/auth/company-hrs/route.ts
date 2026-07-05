import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);
    await requirePageAccess(session, "hrTeam");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const hrs = await prisma.user.findMany({
      where: { companyId: session.companyId, role: "hr" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true,
        companyId: true, employeeNumber: true, mustChangePassword: true, createdAt: true,
      },
    });

    // Enrich with employee record (salary, phone)
    const enriched = await Promise.all(
      hrs.map(async (hr) => {
        if (!hr.employeeNumber) return { ...hr, base_salary: 0, phone: "" };
        const emp = await prisma.employee.findFirst({
          where: { employeeId: hr.employeeNumber, companyId: session.companyId! },
          select: { baseSalary: true, phone: true },
        });
        return {
          ...hr,
          base_salary: emp ? Number(emp.baseSalary) : 0,
          phone: emp?.phone ?? "",
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    return errorResponse(err);
  }
}
