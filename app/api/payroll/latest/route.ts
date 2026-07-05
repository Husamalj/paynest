import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    await requirePageAccess(session, "payroll");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const companyId = session.companyId;
    const settings = await prisma.companySettings.findFirst({ where: { companyId } });
    const mode = settings?.systemMode ?? "daily";
    const isEmployee = session.role === "employee";

    const latest = await prisma.payrollRecord.findFirst({
      where: {
        companyId,
        systemMode: mode,
      },
      orderBy: { calculatedAt: "desc" },
      select: { periodMonth: true, periodYear: true },
    });

    if (!latest) {
      return NextResponse.json({ results: [], period_month: null, period_year: null });
    }

    const { periodMonth, periodYear } = latest;

    const where: any = {
      companyId,
      periodMonth,
      periodYear,
      systemMode: mode,
    };
    if (isEmployee) {
      if (!session.employeeNumber) {
        return NextResponse.json({ period_month: periodMonth, period_year: periodYear, system_mode: mode, results: [] });
      }
      where.employeeId = session.employeeNumber;
    }

    const records = await prisma.payrollRecord.findMany({ where, orderBy: { calculatedAt: "desc" } });

    // Exclude owner / super_admin rows from the payroll list
    const adminUsers = await prisma.user.findMany({
      where: { companyId, role: { in: ["owner", "super_admin"] } },
      select: { employeeNumber: true },
    });
    const adminNums = new Set(adminUsers.map((u) => u.employeeNumber).filter(Boolean) as string[]);
    const visibleRecords = records.filter((r) => !r.employeeId || !adminNums.has(r.employeeId));

    const employees = await prisma.employee.findMany({
      where: { companyId, systemMode: mode },
      select: { employeeId: true, name: true, socialSecurity: true },
    });
    const empMap: Record<string, any> = {};
    for (const e of employees) { if (e.employeeId) empMap[e.employeeId] = e; }

    const results = visibleRecords.map((r) => ({
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
