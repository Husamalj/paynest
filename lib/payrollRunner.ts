import { prisma } from "@/lib/prisma";
import { sendPayslipReady } from "@/lib/email";
import { HttpError, type SessionUser } from "@/lib/auth";
import {
  buildLeaveMap,
  calculateDailyPayroll,
  calculateHoursPayroll,
} from "@/lib/payrollCalc";

type PayrollRunInput = {
  companyId: number;
  requestedBy?: SessionUser;
  periodMonth: number;
  periodYear: number;
  onProgress?: (processedRows: number, totalRows: number) => Promise<void> | void;
};

export async function calculatePayrollRun(input: PayrollRunInput) {
  const { companyId, periodMonth, periodYear, requestedBy, onProgress } = input;
  const settings = await prisma.companySettings.findFirst({ where: { companyId } });
  if (!settings) throw new HttpError(400, "Settings not configured");

  const mode = settings.systemMode || "daily";
  const calcMode = (settings as any).calcMode || settings.systemMode || "daily";
  const isHourly = calcMode === "hours" || calcMode === "hourly";

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

  const monthly = await prisma.monthlySalary.findMany({
    where: { companyId, periodMonth, periodYear, systemMode: mode },
  });
  const schedById = new Map(employees.map((e) => [e.employeeId, e]));
  const roster = monthly.length > 0
    ? monthly
        .filter((m) => !adminNums.includes(m.employeeId))
        .map((m) => {
          const e = schedById.get(m.employeeId);
          return {
            employeeId: m.employeeId,
            name: m.name,
            baseSalary: m.baseSalary,
            socialSecurity: m.socialSecurity,
            workType: e?.workType ?? "standard",
            workdays: e?.workdays ?? null,
            reqHours: e?.reqHours ?? null,
          };
        })
    : employees;
  if (roster.length === 0) throw new HttpError(400, "No employees found");
  await onProgress?.(0, roster.length);

  const periodStart = new Date(periodYear, periodMonth - 1, 1);
  const periodEnd = new Date(periodYear, periodMonth, 0);
  const yearStart = new Date(periodYear, 0, 1);

  const [attendanceRecords, leaveRequests, leaveBalances, bonuses, holidayRows] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        companyId,
        systemMode: mode,
        workDate: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: "approved",
        startDate: { lte: periodEnd },
        endDate: { gte: yearStart },
      },
    }),
    prisma.leaveBalance.findMany({ where: { companyId, year: periodYear } }),
    prisma.bonusDeduction.findMany({
      where: { companyId, periodMonth, periodYear, systemMode: mode },
    }),
    prisma.officialHoliday.findMany({
      where: { companyId, holidayDate: { gte: periodStart, lte: periodEnd } },
      select: { holidayDate: true },
    }),
  ]);

  if (attendanceRecords.length === 0) {
    throw new HttpError(400, `NO_ATTENDANCE: No attendance data found for ${periodMonth}/${periodYear}. Please upload an attendance file for this period first.`);
  }

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
    const dateKey = record.workDate instanceof Date
      ? record.workDate.toISOString().substring(0, 10)
      : String(record.workDate).substring(0, 10);
    attendanceMap[empId][dateKey] = {
      hours_worked: record.hoursWorked,
      clock_in: record.clockIn,
      clock_out: record.clockOut,
    };
  }

  const bonusesMap: Record<string, any[]> = {};
  for (const bd of bonuses) {
    if (!bd.employeeId) continue;
    if (!bonusesMap[bd.employeeId]) bonusesMap[bd.employeeId] = [];
    bonusesMap[bd.employeeId].push(bd);
  }

  const holidays = holidayRows
    .map((h) => h.holidayDate?.toISOString().substring(0, 10))
    .filter(Boolean) as string[];

  const settingsPlain = {
    req_hours: settings.reqHours,
    month_days: settings.monthDays,
    late_tolerance: settings.lateTolerance,
    deduction_rate: settings.deductionRate,
    extra_rate: settings.extraRate,
    workdays: settings.workdays,
    work_start_time: (settings as any).workStartTime ?? "09:00",
    holidays,
  };

  const empPlain = roster.map((e) => ({
    employee_id: e.employeeId,
    name: e.name,
    base_salary: e.baseSalary,
    social_security: e.socialSecurity,
    work_type: e.workType,
    workdays: e.workdays,
    req_hours: e.reqHours != null ? Number(e.reqHours) : null,
  }));

  const payrollResults = isHourly
    ? calculateHoursPayroll(empPlain, attendanceMap, settingsPlain, bonusesMap, leaveMap, { month: periodMonth, year: periodYear })
    : calculateDailyPayroll(empPlain, attendanceMap, settingsPlain, bonusesMap, { month: periodMonth, year: periodYear }, leaveMap);

  const nextMonth = periodMonth === 12 ? 1 : periodMonth + 1;
  const nextYear = periodMonth === 12 ? periodYear + 1 : periodYear;
  const carryReason = `Deferred from ${periodMonth}/${periodYear}`;
  const carryovers: { employeeId: string; name: string; amount: number }[] = [];

  for (const pr of payrollResults as any[]) {
    const ded = Number(pr.deduction_total) || 0;
    const net = Number(pr.net_salary) || 0;
    if (ded > 0 && net < 0) {
      const available = net + ded;
      const applied = Math.max(0, Math.min(ded, available));
      const carry = parseFloat((ded - applied).toFixed(4));
      if (carry > 0) {
        pr.deduction_total = parseFloat(applied.toFixed(4));
        pr.net_salary = parseFloat((available - applied).toFixed(4));
        pr.deferred_deduction = carry;
        if (pr.employee_id) carryovers.push({ employeeId: pr.employee_id, name: pr.name, amount: carry });
      }
    }
  }

  const payrollRows = payrollResults.map((pr: any) => ({
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
  }));

  await prisma.$transaction([
    prisma.payrollRecord.deleteMany({ where: { companyId, periodMonth, periodYear, systemMode: mode } }),
    prisma.payrollRecord.createMany({ data: payrollRows }),
    prisma.bonusDeduction.deleteMany({
      where: { companyId, periodMonth: nextMonth, periodYear: nextYear, systemMode: mode, type: "deduction", reason: carryReason },
    }),
    ...(carryovers.length > 0
      ? [
          prisma.bonusDeduction.createMany({
            data: carryovers.map((c) => ({
              companyId,
              employeeId: c.employeeId,
              employeeName: c.name,
              type: "deduction",
              reason: carryReason,
              amount: c.amount,
              periodMonth: nextMonth,
              periodYear: nextYear,
              systemMode: mode,
            })),
          }),
        ]
      : []),
  ]);
  await onProgress?.(payrollResults.length, payrollResults.length);

  try {
    const empUsers = await prisma.user.findMany({
      where: { companyId, role: "employee" },
      select: { email: true, name: true },
    });
    await Promise.allSettled(
      empUsers
        .filter((u) => u.email)
        .map((u) => sendPayslipReady(companyId, u.email!, u.name || "Employee", periodMonth, periodYear))
    );
  } catch (error) {
    console.error("[payslip email]", error);
  }

  prisma.notification.create({
    data: {
      companyId,
      type: "payroll_completed",
      message: `Payroll run for ${periodMonth}/${periodYear} has been completed.`,
      link: "/payroll",
    },
  }).catch((error: any) => console.error("[notification]", error));

  return {
    period_month: periodMonth,
    period_year: periodYear,
    system_mode: mode,
    results: payrollResults,
    summary: {
      requested_by: requestedBy?.id ?? null,
      employee_count: payrollResults.length,
      total_net_salary: payrollResults.reduce((sum: number, row: any) => sum + (Number(row.net_salary) || 0), 0),
    },
  };
}
