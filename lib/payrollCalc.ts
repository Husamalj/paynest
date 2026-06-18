// Payroll calculation logic — ported verbatim from backend/src/routes/payroll.js

export function isRealClock(val: unknown): boolean {
  if (val == null) return false;
  const s = String(val).trim();
  if (!s) return false;
  return s !== "00:00" && s !== "00:00:00" && s !== "0:00" && s !== "0";
}

export function hasValidClock(record: any): boolean {
  if (!record) return false;
  return isRealClock(record.clock_in) || isRealClock(record.clockIn);
}

export function toDateKey(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().substring(0, 10);
}

export function buildLeaveMap(
  leaves: any[],
  periodStart: Date,
  periodEnd: Date,
  totalsMap: Record<string, any>
): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {};
  const counters: Record<string, { annual: number; sick: number }> = {};
  const periodStartKey = toDateKey(periodStart);
  const periodEndKey = toDateKey(periodEnd);
  if (!periodStartKey || !periodEndKey) return map;

  const sorted = [...(leaves || [])].sort((a, b) => {
    return new Date(a.start_date ?? a.startDate).getTime() - new Date(b.start_date ?? b.startDate).getTime();
  });

  sorted.forEach((leave) => {
    const employeeId = leave.employee_id ?? leave.employeeId;
    if (!employeeId) return;
    const type = String(leave.leave_type ?? leave.leaveType ?? "").toLowerCase();
    const startKey = toDateKey(leave.start_date ?? leave.startDate);
    const endKey = toDateKey(leave.end_date ?? leave.endDate ?? leave.start_date ?? leave.startDate);
    if (!startKey || !endKey) return;

    const start = new Date(startKey);
    const end = new Date(endKey);

    if (!counters[employeeId]) counters[employeeId] = { annual: 0, sick: 0 };

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().substring(0, 10);
      const inPeriod = key >= periodStartKey && key <= periodEndKey;
      let mark: string | null = null;

      if (type === "online") {
        mark = "online"; // approved online workday — counts as a full present day
      } else if (type === "unpaid") {
        mark = "unpaid";
      } else if (type === "annual" || type === "sick") {
        const limit =
          (totalsMap?.[employeeId]?.[`${type}_total`] != null
            ? parseInt(totalsMap[employeeId][`${type}_total`], 10)
            : 14) || 14;
        const used = counters[employeeId][type as "annual" | "sick"] || 0;
        mark = used < limit ? "paid" : "unpaid";
        counters[employeeId][type as "annual" | "sick"] = used + 1;
      } else {
        mark = "paid";
      }

      if (!inPeriod) continue;
      if (!map[employeeId]) map[employeeId] = {};
      if (map[employeeId][key] === "unpaid") continue;
      map[employeeId][key] = mark!;
    }
  });

  return map;
}

export function getWorkdaysInMonth(year: number, month: number, workdayNames: string[]): string[] {
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const allowedDays = workdayNames.map((d) => dayMap[d]).filter((d) => d !== undefined);
  const days: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (allowedDays.includes(date.getDay())) {
      days.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  return days;
}

export function calculateDailyPayroll(
  employees: any[],
  attendanceMap: Record<string, Record<string, any>>,
  settings: any,
  bonusesMap: Record<string, any[]>,
  period: { month: number; year: number },
  leaveMap: Record<string, Record<string, string>>
) {
  const { month, year } = period;
  const companyWorkdayNames = settings.workdays
    ? settings.workdays.split(",").map((s: string) => s.trim())
    : ["Sun", "Mon", "Tue", "Wed", "Thu"];
  const holidaySet = new Set<string>(Array.isArray(settings.holidays) ? settings.holidays : []);
  const companyReqHours = parseFloat(settings.req_hours ?? settings.reqHours) || 8;
  const monthDays = parseFloat(settings.month_days ?? settings.monthDays) || 26;
  const lateTolerance = parseFloat(settings.late_tolerance ?? settings.lateTolerance) || 0;
  const deductionRate = parseFloat(settings.deduction_rate ?? settings.deductionRate) || 1.0;
  const extraRate = parseFloat(settings.extra_rate ?? settings.extraRate) || 1.0;

  return employees.map((emp) => {
    const baseSalary = parseFloat(emp.base_salary ?? emp.baseSalary) || 0;
    const empId = emp.employee_id ?? emp.employeeId;
    const empAttendance = attendanceMap[empId] || {};
    const empBonuses = bonusesMap[empId] || [];
    const empLeaves = (leaveMap && leaveMap[empId]) || {};

    // Per-employee schedule (override company defaults)
    const workType = String(emp.work_type ?? emp.workType ?? "standard");
    const isFixed = workType === "fixed";
    const empWorkdayRaw = emp.workdays ?? emp.work_days;
    const workdayNames = empWorkdayRaw
      ? String(empWorkdayRaw).split(",").map((s: string) => s.trim()).filter(Boolean)
      : companyWorkdayNames;
    const reqHours = parseFloat(emp.req_hours ?? emp.reqHours) || companyReqHours;
    // Official holidays are paid days off — drop them from the working days
    const workdays = getWorkdaysInMonth(year, month, workdayNames).filter((d) => !holidaySet.has(d));
    const hourlyRate = baseSalary / (monthDays * reqHours);

    // ── Daily-wage (مياومة): paid only for days actually attended ──
    // baseSalary holds the DAILY rate. Each attended day pays the daily rate,
    // minus a shortfall (if under required hours) or plus overtime (if over).
    // Absent days pay nothing. No social security.
    if (workType === "daily_wage") {
      const dailyRate = baseSalary;
      const hrRate = reqHours > 0 ? dailyRate / reqHours : 0;
      let earned = 0;
      let dwHours = 0;
      let daysWorked = 0;
      const breakdown: any[] = [];
      for (const [dateKey, record] of Object.entries(empAttendance)) {
        if (!hasValidClock(record)) continue;
        const hours = parseFloat((record as any).hours_worked ?? (record as any).hoursWorked) || 0;
        dwHours += hours;
        daysWorked += 1;
        let dayPay = dailyRate;
        if (hours < reqHours) dayPay = dailyRate - (reqHours - hours) * hrRate * deductionRate;
        else if (hours > reqHours) dayPay = dailyRate + (hours - reqHours) * hrRate * extraRate;
        if (dayPay < 0) dayPay = 0;
        earned += dayPay;
        breakdown.push({ date: dateKey, hours_worked: hours, required: reqHours, diff: parseFloat((hours - reqHours).toFixed(4)), adjustment: parseFloat(dayPay.toFixed(4)), status: "present", check_in: (record as any).clock_in ?? (record as any).clockIn ?? null, check_out: (record as any).clock_out ?? (record as any).clockOut ?? null });
      }
      breakdown.sort((a, b) => a.date.localeCompare(b.date));
      let bonusT = 0, dedT = 0;
      for (const bd of empBonuses) {
        if (bd.type === "bonus") bonusT += parseFloat(bd.amount) || 0;
        else if (bd.type === "deduction") dedT += parseFloat(bd.amount) || 0;
      }
      const net = earned + bonusT - dedT; // no social security for daily wage
      const reqTotal = daysWorked * reqHours;
      return {
        employee_id: empId,
        name: emp.name,
        base_salary: parseFloat(earned.toFixed(4)), // earned from attendance
        total_hours: parseFloat(dwHours.toFixed(4)),
        required_hours: parseFloat(reqTotal.toFixed(4)),
        hour_diff: parseFloat((dwHours - reqTotal).toFixed(4)),
        adjustment: 0,
        social_security_deduct: 0,
        bonus_total: parseFloat(bonusT.toFixed(4)),
        deduction_total: parseFloat(dedT.toFixed(4)),
        net_salary: parseFloat(net.toFixed(4)),
        status: daysWorked === 0 ? "Has Deductions" : "Full Attendance",
        daily_breakdown: breakdown,
      };
    }

    let totalAdjustment = 0;
    let totalHours = 0;
    let paidLeaveDays = 0;
    const dailyBreakdown: any[] = [];

    for (const workday of workdays) {
      const leaveStatus = empLeaves[workday];
      const record = empAttendance[workday];

      if (leaveStatus === "online" && !(record && hasValidClock(record))) {
        // Approved online workday with no check-in/out — counts as a full present day.
        // (If the employee DID check in/out, the attendance branch below uses real hours.)
        paidLeaveDays += 1;
        dailyBreakdown.push({ date: workday, hours_worked: reqHours, required: reqHours, diff: 0, adjustment: 0, status: "online" });
      } else if (leaveStatus === "paid" || leaveStatus === "unpaid") {
        const isUnpaid = leaveStatus === "unpaid";
        if (!isUnpaid) paidLeaveDays += 1;
        if (isUnpaid && !isFixed) {
          const fullDayDeduct = -(reqHours * hourlyRate);
          totalAdjustment += fullDayDeduct;
          dailyBreakdown.push({ date: workday, hours_worked: 0, required: reqHours, diff: -reqHours, adjustment: parseFloat(fullDayDeduct.toFixed(4)), status: "absent" });
        } else {
          dailyBreakdown.push({ date: workday, hours_worked: 0, required: 0, diff: 0, adjustment: 0, status: "present" });
        }
      } else if (record && hasValidClock(record)) {
        const hoursWorked = parseFloat(record.hours_worked ?? record.hoursWorked) || 0;
        totalHours += hoursWorked;
        const toleranceHours = lateTolerance / 60;
        const effectiveRequired = reqHours - toleranceHours;
        const diff = hoursWorked - reqHours;
        let dayAdjustment = 0;
        // Fixed/exempt employees: presence recorded, but no deduction or overtime
        if (!isFixed) {
          if (hoursWorked < effectiveRequired) {
            dayAdjustment = -(( reqHours - hoursWorked) * hourlyRate * deductionRate);
          } else if (hoursWorked > reqHours) {
            dayAdjustment = (hoursWorked - reqHours) * hourlyRate * extraRate;
          }
        }
        totalAdjustment += dayAdjustment;
        dailyBreakdown.push({ date: workday, hours_worked: hoursWorked, required: isFixed ? 0 : reqHours, diff: parseFloat(diff.toFixed(4)), adjustment: parseFloat(dayAdjustment.toFixed(4)), status: "present", check_in: record.clock_in ?? record.clockIn ?? null, check_out: record.clock_out ?? record.clockOut ?? null });
      } else if (isFixed) {
        // Fixed employee who didn't clock in this day — no penalty
        dailyBreakdown.push({ date: workday, hours_worked: 0, required: 0, diff: 0, adjustment: 0, status: "present" });
      } else {
        const fullDayDeduct = -(reqHours * hourlyRate);
        totalAdjustment += fullDayDeduct;
        dailyBreakdown.push({ date: workday, hours_worked: 0, required: reqHours, diff: -reqHours, adjustment: parseFloat(fullDayDeduct.toFixed(4)), status: "absent" });
      }
    }

    // Official holidays: paid day off. If the employee actually clocked in/out,
    // ALL the worked hours count as overtime (paid at the extra rate).
    for (const holiday of holidaySet) {
      const record = empAttendance[holiday];
      if (record && hasValidClock(record)) {
        const hoursWorked = parseFloat(record.hours_worked ?? record.hoursWorked) || 0;
        totalHours += hoursWorked;
        const dayAdjustment = isFixed ? 0 : hoursWorked * hourlyRate * extraRate;
        totalAdjustment += dayAdjustment;
        dailyBreakdown.push({ date: holiday, hours_worked: hoursWorked, required: 0, diff: parseFloat(hoursWorked.toFixed(4)), adjustment: parseFloat(dayAdjustment.toFixed(4)), status: "holiday", check_in: record.clock_in ?? record.clockIn ?? null, check_out: record.clock_out ?? record.clockOut ?? null });
      } else {
        dailyBreakdown.push({ date: holiday, hours_worked: 0, required: 0, diff: 0, adjustment: 0, status: "holiday" });
      }
    }

    const socialSecurityDeduct = emp.social_security || emp.socialSecurity ? baseSalary * 0.075 : 0;
    let bonusTotal = 0;
    let deductionTotal = 0;
    for (const bd of empBonuses) {
      if (bd.type === "bonus") bonusTotal += parseFloat(bd.amount) || 0;
      else if (bd.type === "deduction") deductionTotal += parseFloat(bd.amount) || 0;
    }
    const netSalary = baseSalary + totalAdjustment - socialSecurityDeduct + bonusTotal - deductionTotal;
    const requiredHours = Math.max(0, (workdays.length - paidLeaveDays) * reqHours);
    const hourDiff = totalHours - requiredHours;

    // Two states only: worked less than required → deductions, otherwise complete
    const status = totalAdjustment < 0 ? "Has Deductions" : "Full Attendance";

    return {
      employee_id: empId,
      name: emp.name,
      base_salary: baseSalary,
      total_hours: parseFloat(totalHours.toFixed(4)),
      required_hours: parseFloat(requiredHours.toFixed(4)),
      hour_diff: parseFloat(hourDiff.toFixed(4)),
      adjustment: parseFloat(totalAdjustment.toFixed(4)),
      social_security_deduct: parseFloat(socialSecurityDeduct.toFixed(4)),
      bonus_total: parseFloat(bonusTotal.toFixed(4)),
      deduction_total: parseFloat(deductionTotal.toFixed(4)),
      net_salary: parseFloat(netSalary.toFixed(4)),
      status,
      daily_breakdown: dailyBreakdown,
    };
  });
}

export function calculateHoursPayroll(
  employees: any[],
  attendanceMap: Record<string, Record<string, any>>,
  settings: any,
  bonusesMap: Record<string, any[]>,
  leaveMap: Record<string, Record<string, string>>,
  period: { month: number; year: number }
) {
  // In hourly mode, month_days stores the total required hours per month (e.g. 176)
  // hourlyRate = baseSalary / requiredMonthlyHours
  // deduction  = missingHours × hourlyRate × deductionRate
  const baseRequiredHours = parseFloat(settings.month_days ?? settings.monthDays) || 176;
  const deductionRate = parseFloat(settings.deduction_rate ?? settings.deductionRate) || 1.0;
  const extraRate = parseFloat(settings.extra_rate ?? settings.extraRate) || 1.0;
  const { month, year } = period;
  // Official holidays in this month — reduce the required hours (paid days off)
  const holidaysInMonth = (Array.isArray(settings.holidays) ? settings.holidays : []).filter((d: string) => {
    const dt = new Date(d);
    return !Number.isNaN(dt.getTime()) && dt.getMonth() + 1 === month && dt.getFullYear() === year;
  }).length;

  return employees.map((emp) => {
    const baseSalary = parseFloat(emp.base_salary ?? emp.baseSalary) || 0;
    const hourlyRate = baseRequiredHours > 0 ? baseSalary / baseRequiredHours : 0;
    const empId = emp.employee_id ?? emp.employeeId;
    const empAttendance = attendanceMap[empId] || {};
    const empBonuses = bonusesMap[empId] || [];
    const empLeaves = (leaveMap && leaveMap[empId]) || {};

    const paidLeaveDays = Object.entries(empLeaves).reduce((count, [dateKey, type]) => {
      if (type !== "paid") return count;
      const d = new Date(dateKey);
      if (Number.isNaN(d.getTime())) return count;
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return count;
      return count + 1;
    }, 0);

    // Estimate hours per day from monthly target (divide by ~26 working days)
    const estHoursPerDay = baseRequiredHours / 26;
    const requiredHours = Math.max(0, baseRequiredHours - (paidLeaveDays + holidaysInMonth) * estHoursPerDay);
    let totalHours = 0;

    for (const [dateKey, record] of Object.entries(empAttendance)) {
      if (empLeaves[dateKey]) continue;
      if (!hasValidClock(record)) continue;
      totalHours += parseFloat((record as any).hours_worked ?? (record as any).hoursWorked) || 0;
    }

    const isFixed = String(emp.work_type ?? emp.workType ?? "standard") === "fixed";
    const diff = totalHours - requiredHours;
    let adjustment = 0;
    if (!isFixed) {
      if (diff < 0) adjustment = diff * hourlyRate * deductionRate;
      else if (diff > 0) adjustment = diff * hourlyRate * extraRate;
    }

    const socialSecurityDeduct = emp.social_security || emp.socialSecurity ? baseSalary * 0.075 : 0;
    let bonusTotal = 0;
    let deductionTotal = 0;
    for (const bd of empBonuses) {
      if (bd.type === "bonus") bonusTotal += parseFloat(bd.amount) || 0;
      else if (bd.type === "deduction") deductionTotal += parseFloat(bd.amount) || 0;
    }
    const netSalary = baseSalary + adjustment - socialSecurityDeduct + bonusTotal - deductionTotal;

    // Two states only: worked less than required → deductions, otherwise complete
    const status = adjustment < 0 ? "Has Deductions" : "Full Attendance";

    return {
      employee_id: empId,
      name: emp.name,
      base_salary: baseSalary,
      total_hours: parseFloat(totalHours.toFixed(4)),
      required_hours: parseFloat(requiredHours.toFixed(4)),
      hour_diff: parseFloat(diff.toFixed(4)),
      adjustment: parseFloat(adjustment.toFixed(4)),
      social_security_deduct: parseFloat(socialSecurityDeduct.toFixed(4)),
      bonus_total: parseFloat(bonusTotal.toFixed(4)),
      deduction_total: parseFloat(deductionTotal.toFixed(4)),
      net_salary: parseFloat(netSalary.toFixed(4)),
      status,
      daily_breakdown: null,
    };
  });
}
