import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { sendPayslipReady } from "@/lib/email";
import {
  buildLeaveMap,
  calculateDailyPayroll,
  calculateHoursPayroll,
  toDateKey,
} from "@/lib/payrollCalc";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const now = new Date();
    const periodMonth: number = body.month || now.getMonth() + 1;
    const periodYear: number = body.year || now.getFullYear();
    const companyId = session.companyId;

    const settings = await prisma.companySettings.findFirst({ where: { companyId } });
    if (!settings) throw new HttpError(400, "Settings not configured");

    const mode = settings.systemMode || "daily";

    // Exclude owner / super_admin from payroll (they are not paid employees)
    const adminUsers = await prisma.user.findMany({
      where: { companyId, role: { in: ["owner", "super_admin"] } },
      select: { employeeNumber: true },
    });
    const adminNums = adminUsers.map((u) => u.employeeNumber).filter(Boolean) as string[];

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        systemMode: mode,
        ...(adminNums.length > 0 ? { NOT: { employeeId: { in: adminNums } } } : {}),
      },
      orderBy: { name: "asc" },
    });
    if (employees.length === 0) throw new HttpError(400, "No employees found");

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        companyId,
        systemMode: mode,
        workDate: {
          gte: new Date(periodYear, periodMonth - 1, 1),
          lte: new Date(periodYear, periodMonth, 0),
        },
      },
    });

    if (attendanceRecords.length === 0) {
      throw new HttpError(400, `NO_ATTENDANCE: No attendance data found for ${periodMonth}/${periodYear}. Please upload an attendance file for this period first.`);
    }

    const periodStart = new Date(periodYear, periodMonth - 1, 1);
    const periodEnd = new Date(periodYear, periodMonth, 0);
    const yearStart = new Date(periodYear, 0, 1);

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: "approved",
        startDate: { lte: periodEnd },
        endDate: { gte: yearStart },
      },
    });

    const leaveBalances = await prisma.leaveBalance.findMany({
      where: { companyId, year: periodYear },
    });

    const totalsMap: Record<string, any> = {};
    for (const row of leaveBalances) {
      if (!row.employeeId) continue;
      totalsMap[row.employeeId] = { annual_total: row.annualTotal, sick_total: row.sickTotal };
    }

    const leaveMap = buildLeaveMap(
      leaveRequests.map((l) => ({
        employee_id: l.employeeId,
        leave_type: l.leaveType,
        start_date: l.startDate,
        end_date: l.endDate,
      })),
      periodStart,
      periodEnd,
      totalsMap
    );

    const attendanceMap: Record<string, Record<string, any>> = {};
    for (const record of attendanceRecords) {
      const empId = record.employeeId;
      if (!empId) continue;
      if (!attendanceMap[empId]) attendanceMap[empId] = {};
      const dateKey =
        record.workDate instanceof Date
          ? record.workDate.toISOString().substring(0, 10)
          : String(record.workDate).substring(0, 10);
      attendanceMap[empId][dateKey] = {
        hours_worked: record.hoursWorked,
        clock_in: record.clockIn,
        clock_out: record.clockOut,
      };
    }

    const bonuses = await prisma.bonusDeduction.findMany({
      where: {
        companyId,
        periodMonth,
        periodYear,
        systemMode: mode,
      },
    });

    const bonusesMap: Record<string, any[]> = {};
    for (const bd of bonuses) {
      if (!bd.employeeId) continue;
      if (!bonusesMap[bd.employeeId]) bonusesMap[bd.employeeId] = [];
      bonusesMap[bd.employeeId].push(bd);
    }

    const settingsPlain = {
      req_hours: settings.reqHours,
      month_days: settings.monthDays,
      late_tolerance: settings.lateTolerance,
      deduction_rate: settings.deductionRate,
      extra_rate: settings.extraRate,
      workdays: settings.workdays,
      work_start_time: (settings as any).workStartTime ?? "09:00",
    };

    const empPlain = employees.map((e) => ({
      employee_id: e.employeeId,
      name: e.name,
      base_salary: e.baseSalary,
      social_security: e.socialSecurity,
    }));

    let payrollResults;
    if (mode === "hours") {
      payrollResults = calculateHoursPayroll(empPlain, attendanceMap, settingsPlain, bonusesMap, leaveMap, { month: periodMonth, year: periodYear });
    } else {
      payrollResults = calculateDailyPayroll(empPlain, attendanceMap, settingsPlain, bonusesMap, { month: periodMonth, year: periodYear }, leaveMap);
    }

    // Delete existing records for this period then insert new ones
    await prisma.payrollRecord.deleteMany({
      where: {
        companyId,
        periodMonth,
        periodYear,
        systemMode: mode,
      },
    });

    await prisma.$transaction(
      payrollResults.map((pr) =>
        prisma.payrollRecord.create({
          data: {
            companyId,
            employeeId: pr.employee_id,
            periodMonth,
            periodYear,
            baseSalary: pr.base_salary,
            totalHours: pr.total_hours,
            requiredHours: pr.required_hours,
            hourDiff: pr.hour_diff,
            adjustment: pr.adjustment,
            socialSecurityDeduct: pr.social_security_deduct,
            bonusTotal: pr.bonus_total,
            deductionTotal: pr.deduction_total,
            netSalary: pr.net_salary,
            status: pr.status,
            dailyBreakdown: pr.daily_breakdown ?? undefined,
            systemMode: mode,
          },
        })
      )
    );

    // Fire payslip-ready emails (non-blocking)
    try {
      const empUsers = await prisma.user.findMany({
        where: { companyId: session.companyId, role: "employee" },
        select: { email: true, name: true, employeeNumber: true },
      });
      for (const u of empUsers) {
        if (u.email) {
          sendPayslipReady(u.email, u.name || "Employee", periodMonth, periodYear);
        }
      }
    } catch (e) {
      console.error("[payslip email]", e);
    }

    // Create payroll run notification
    prisma.notification.create({
      data: {
        companyId: session.companyId!,
        type: "payroll_completed",
        message: `Payroll run for ${periodMonth}/${periodYear} has been completed.`,
        link: "/payroll",
      },
    }).catch((e: any) => console.error("[notification]", e));

    return NextResponse.json({
      period_month: periodMonth,
      period_year: periodYear,
      system_mode: mode,
      results: payrollResults,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
