import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const periodMonth = parseInt(url.searchParams.get("month") ?? "", 10);
    const periodYear = parseInt(url.searchParams.get("year") ?? "", 10);
    if (!periodMonth || !periodYear) throw new HttpError(400, "month and year are required");

    const companyId = session.companyId;
    const settings = await prisma.companySettings.findFirst({ where: { companyId } });
    const mode = settings?.systemMode ?? "daily";

    const records = await prisma.payrollRecord.findMany({
      where: {
        companyId,
        periodMonth,
        periodYear,
        systemMode: mode,
      },
      orderBy: { calculatedAt: "desc" },
    });

    const employees = await prisma.employee.findMany({
      where: { companyId, systemMode: mode },
      select: { employeeId: true, name: true, socialSecurity: true },
    });
    const empMap: Record<string, any> = {};
    for (const e of employees) { if (e.employeeId) empMap[e.employeeId] = e; }

    const results = records.map((r) => ({
      ...r,
      // snake_case mirrors for legacy UI code (dashboard, reports, etc.)
      base_salary:             r.baseSalary,
      total_hours:             r.totalHours,
      required_hours:          r.requiredHours,
      hour_diff:               r.hourDiff,
      adjustment:              r.adjustment,
      bonus_total:             r.bonusTotal,
      deduction_total:         r.deductionTotal,
      social_security_deduct:  r.socialSecurityDeduct,
      net_salary:              r.netSalary,
      period_month:            r.periodMonth,
      period_year:             r.periodYear,
      daily_breakdown:         r.dailyBreakdown,
      employee_id:             r.employeeId,
      name:                    empMap[r.employeeId ?? ""]?.name ?? r.employeeId,
      social_security:         empMap[r.employeeId ?? ""]?.socialSecurity ?? false,
    }));

    return NextResponse.json({ period_month: periodMonth, period_year: periodYear, system_mode: mode, results });
  } catch (err) {
    return errorResponse(err);
  }
}
