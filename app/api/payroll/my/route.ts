import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/payroll/my — all payroll records for the logged-in employee (each month). */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const employeeId = session.employeeNumber ?? "";

    const records = await prisma.payrollRecord.findMany({
      where: { companyId: session.companyId, employeeId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return NextResponse.json(
      records.map((r) => ({
        period_month: r.periodMonth,
        period_year: r.periodYear,
        base_salary: r.baseSalary,
        net_salary: r.netSalary,
        total_hours: r.totalHours,
        hour_diff: r.hourDiff,
        adjustment: r.adjustment,
        bonus_total: r.bonusTotal,
        deduction_total: r.deductionTotal,
        social_security_deduct: r.socialSecurityDeduct,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}
