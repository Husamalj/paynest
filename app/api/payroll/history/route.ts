import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const companyId = session.companyId;
    const settings = await prisma.companySettings.findFirst({ where: { companyId } });
    const mode = settings?.systemMode ?? "daily";

    const grouped = await prisma.payrollRecord.groupBy({
      by: ["periodMonth", "periodYear"],
      where: { companyId, systemMode: mode },
      _count: { id: true },
      _sum: { netSalary: true, baseSalary: true },
      _max: { calculatedAt: true },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return NextResponse.json(
      grouped.map((g) => ({
        period_month: g.periodMonth,
        period_year: g.periodYear,
        employee_count: (g._count as any).id ?? 0,
        total_net: (g._sum as any).netSalary ?? 0,
        total_base: (g._sum as any).baseSalary ?? 0,
        calculated_at: (g._max as any).calculatedAt,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}
