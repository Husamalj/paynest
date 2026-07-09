import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { calculatePayrollRun } from "@/lib/payrollRunner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "payroll");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const now = new Date();
    const result = await calculatePayrollRun({
      companyId: session.companyId,
      requestedBy: session,
      periodMonth: Number(body.month) || now.getMonth() + 1,
      periodYear: Number(body.year) || now.getFullYear(),
    });

    return NextResponse.json({
      period_month: result.period_month,
      period_year: result.period_year,
      system_mode: result.system_mode,
      results: result.results,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
