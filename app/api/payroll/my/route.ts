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
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { id: "desc" }],
    });

    // Keep only the most recent record per (month, year) — avoids duplicate periods
    const seen = new Set<string>();
    const deduped = records.filter((r) => {
      const k = `${r.periodMonth}-${r.periodYear}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Split out advance-related deductions so the employee sees them as a
    // separate "advance deduction" line instead of generic "manual deductions".
    const ded = await prisma.bonusDeduction.findMany({
      where: { companyId: session.companyId, employeeId, type: "deduction" },
      select: { periodMonth: true, periodYear: true, amount: true, reason: true },
    });
    const advByPeriod: Record<string, number> = {};
    for (const d of ded) {
      if (/سلفة|advance/i.test(d.reason || "")) {
        const k = `${d.periodMonth}-${d.periodYear}`;
        advByPeriod[k] = (advByPeriod[k] || 0) + (Number(d.amount) || 0);
      }
    }

    return NextResponse.json(
      deduped.map((r) => ({
        period_month: r.periodMonth,
        period_year: r.periodYear,
        base_salary: r.baseSalary,
        net_salary: r.netSalary,
        total_hours: r.totalHours,
        hour_diff: r.hourDiff,
        adjustment: r.adjustment,
        bonus_total: r.bonusTotal,
        deduction_total: r.deductionTotal,
        advance_deduction: advByPeriod[`${r.periodMonth}-${r.periodYear}`] || 0,
        social_security_deduct: r.socialSecurityDeduct,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}
