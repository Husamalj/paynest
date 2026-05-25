import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { hasValidClock } from "@/lib/payrollCalc";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const employee_id = url.searchParams.get("employee_id");
    const periodMonth = parseInt(url.searchParams.get("month") ?? "", 10);
    const periodYear = parseInt(url.searchParams.get("year") ?? "", 10);
    if (!employee_id || !periodMonth || !periodYear) throw new HttpError(400, "employee_id, month and year are required");

    const companyId = session.companyId;
    const settings = await prisma.companySettings.findFirst({ where: { companyId } });
    const mode = settings?.systemMode ?? "daily";

    const employee = await prisma.employee.findFirst({
      where: { employeeId: employee_id, companyId, systemMode: mode },
      orderBy: { updatedAt: "desc" },
    });

    const payroll = await prisma.payrollRecord.findFirst({
      where: {
        employeeId: employee_id,
        periodMonth,
        periodYear,
        companyId,
        systemMode: mode,
      },
      orderBy: { calculatedAt: "desc" },
    });

    const attendance = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: employee_id,
        companyId,
        systemMode: mode,
        workDate: {
          gte: new Date(periodYear, periodMonth - 1, 1),
          lte: new Date(periodYear, periodMonth, 0),
        },
      },
      orderBy: { workDate: "asc" },
    });

    const attendanceRows = attendance.map((row) => ({
      ...row,
      hours_worked: hasValidClock({ clock_in: row.clockIn, clock_out: row.clockOut }) ? row.hoursWorked : 0,
    }));

    const bonuses = await prisma.bonusDeduction.findMany({
      where: {
        employeeId: employee_id,
        periodMonth,
        periodYear,
        companyId,
        systemMode: mode,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      employee: employee ?? { employee_id, name: employee_id },
      payroll: payroll ?? null,
      attendance: attendanceRows,
      bonuses,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
