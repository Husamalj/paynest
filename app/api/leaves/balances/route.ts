import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const targetYear = parseInt(url.searchParams.get("year") ?? "", 10) || new Date().getFullYear();
    const companyId = session.companyId;

    const settings = await prisma.companySettings.findFirst({ where: { companyId } });
    const mode = settings?.systemMode ?? "daily";

    const where: any = {
      companyId,
      systemMode: mode,
      baseSalary: { gte: 0 },
      employeeId: { not: null },
    };
    if (session.role === "employee") {
      where.employeeId = session.employeeNumber;
    }

    const employees = await prisma.employee.findMany({
      where,
      distinct: ["employeeId"],
      orderBy: [{ employeeId: "asc" }, { updatedAt: "desc" }, { id: "desc" }],
      select: { employeeId: true, name: true },
    });

    const balances = await prisma.leaveBalance.findMany({
      where: { year: targetYear, companyId },
    });

    const balanceMap: Record<string, any> = {};
    for (const b of balances) {
      if (!b.employeeId) continue;
      if (!balanceMap[b.employeeId]) {
        balanceMap[b.employeeId] = { annual_total: b.annualTotal, annual_used: 0, sick_total: b.sickTotal, sick_used: 0 };
      }
      balanceMap[b.employeeId].annual_used += b.annualUsed;
      balanceMap[b.employeeId].sick_used += b.sickUsed;
    }

    const result = employees
      .filter((e) => e.employeeId)
      .map((e) => {
        const b = balanceMap[e.employeeId!] ?? { annual_total: 14, annual_used: 0, sick_total: 14, sick_used: 0 };
        return {
          employee_id: e.employeeId,
          name: e.name,
          annual_total: b.annual_total,
          annual_used: b.annual_used,
          sick_total: b.sick_total,
          sick_used: b.sick_used,
          annual_remaining: b.annual_total - b.annual_used,
          sick_remaining: b.sick_total - b.sick_used,
        };
      });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
