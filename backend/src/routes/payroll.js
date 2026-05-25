const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireRole } = require('../middleware/auth');

function getCompanyId(req) {
  return req.user?.companyId || 1;
}

async function getSystemMode(companyId) {
  const r = await pool.query(
    'SELECT system_mode FROM company_settings WHERE company_id = $1 ORDER BY id LIMIT 1',
    [companyId]
  );

  return r.rows[0]?.system_mode || 'daily';
}

function isRealClock(val) {
  if (val == null) return false;
  const s = String(val).trim();
  if (!s) return false;
  return s !== '00:00' && s !== '00:00:00' && s !== '0:00' && s !== '0';
}

function hasValidClock(record) {
  if (!record) return false;
  return isRealClock(record.clock_in) || isRealClock(record.clock_out);
}

function toDateKey(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().substring(0, 10);
}

function buildLeaveMap(leaves, periodStart, periodEnd, totalsMap) {
  const map = {};
  const counters = {};
  const periodStartKey = toDateKey(periodStart);
  const periodEndKey = toDateKey(periodEnd);
  if (!periodStartKey || !periodEndKey) return map;

  const sorted = [...(leaves || [])].sort((a, b) => {
    const ad = new Date(a.start_date);
    const bd = new Date(b.start_date);
    return ad - bd;
  });

  sorted.forEach((leave) => {
    const employeeId = leave.employee_id;
    if (!employeeId) return;
    const type = String(leave.leave_type || '').toLowerCase();
    const startKey = toDateKey(leave.start_date);
    const endKey = toDateKey(leave.end_date || leave.start_date);
    if (!startKey || !endKey) return;

    const start = new Date(startKey);
    const end = new Date(endKey);

    if (!counters[employeeId]) {
      counters[employeeId] = { annual: 0, sick: 0 };
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().substring(0, 10);
      const inPeriod = key >= periodStartKey && key <= periodEndKey;
      let mark = null;

      if (type === 'unpaid') {
        mark = 'unpaid';
      } else if (type === 'annual' || type === 'sick') {
        const limit =
          (totalsMap?.[employeeId]?.[`${type}_total`] != null
            ? parseInt(totalsMap[employeeId][`${type}_total`], 10)
            : 14) || 14;

        const used = counters[employeeId][type] || 0;
        const isPaid = used < limit;
        counters[employeeId][type] = used + 1;
        mark = isPaid ? 'paid' : 'unpaid';
      } else {
        mark = 'paid';
      }

      if (!inPeriod) continue;
      if (!map[employeeId]) map[employeeId] = {};
      if (map[employeeId][key] === 'unpaid') continue;
      map[employeeId][key] = mark;
    }
  });

  return map;
}

function getWorkdaysInMonth(year, month, workdayNames) {
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const allowedDays = workdayNames.map((d) => dayMap[d]).filter((d) => d !== undefined);
  const days = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (allowedDays.includes(date.getDay())) {
      days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }

  return days;
}

function calculateDailyPayroll(employees, attendanceMap, settings, bonusesMap, period, leaveMap) {
  const { month, year } = period;
  const workdayNames = settings.workdays
    ? settings.workdays.split(',').map((s) => s.trim())
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

  const workdays = getWorkdaysInMonth(year, month, workdayNames);
  const reqHours = parseFloat(settings.req_hours) || 8;
  const monthDays = parseFloat(settings.month_days) || 26;
  const lateTolerance = parseFloat(settings.late_tolerance) || 0;
  const deductionRate = parseFloat(settings.deduction_rate) || 1.0;
  const extraRate = parseFloat(settings.extra_rate) || 1.0;

  return employees.map((emp) => {
    const baseSalary = parseFloat(emp.base_salary) || 0;
    const hourlyRate = baseSalary / (monthDays * reqHours);
    const empAttendance = attendanceMap[emp.employee_id] || {};
    const empBonuses = bonusesMap[emp.employee_id] || [];
    const empLeaves = (leaveMap && leaveMap[emp.employee_id]) || {};

    let totalAdjustment = 0;
    let totalHours = 0;
    let paidLeaveDays = 0;
    const dailyBreakdown = [];

    for (const workday of workdays) {
      const leaveStatus = empLeaves[workday];
      const record = empAttendance[workday];

      if (leaveStatus === 'paid' || leaveStatus === 'unpaid') {
        const isUnpaid = leaveStatus === 'unpaid';
        if (!isUnpaid) paidLeaveDays += 1;

        if (isUnpaid) {
          const fullDayDeduct = -(reqHours * hourlyRate);
          totalAdjustment += fullDayDeduct;
          dailyBreakdown.push({
            date: workday,
            hours_worked: 0,
            required: reqHours,
            diff: -reqHours,
            adjustment: parseFloat(fullDayDeduct.toFixed(4)),
            status: 'absent',
          });
        } else {
          dailyBreakdown.push({
            date: workday,
            hours_worked: 0,
            required: 0,
            diff: 0,
            adjustment: 0,
            status: 'present',
          });
        }
      } else if (record && hasValidClock(record)) {
        const hoursWorked = parseFloat(record.hours_worked) || 0;
        totalHours += hoursWorked;

        const toleranceHours = lateTolerance / 60;
        const effectiveRequired = reqHours - toleranceHours;
        const diff = hoursWorked - reqHours;

        let dayAdjustment = 0;

        if (hoursWorked < effectiveRequired) {
          const deficit = reqHours - hoursWorked;
          dayAdjustment = -(deficit * hourlyRate * deductionRate);
        } else if (hoursWorked > reqHours) {
          const surplus = hoursWorked - reqHours;
          dayAdjustment = surplus * hourlyRate * extraRate;
        }

        totalAdjustment += dayAdjustment;
        dailyBreakdown.push({
          date: workday,
          hours_worked: hoursWorked,
          required: reqHours,
          diff: parseFloat(diff.toFixed(4)),
          adjustment: parseFloat(dayAdjustment.toFixed(4)),
          status: 'present',
        });
      } else {
        const fullDayDeduct = -(reqHours * hourlyRate);
        totalAdjustment += fullDayDeduct;
        dailyBreakdown.push({
          date: workday,
          hours_worked: 0,
          required: reqHours,
          diff: -reqHours,
          adjustment: parseFloat(fullDayDeduct.toFixed(4)),
          status: 'absent',
        });
      }
    }

    const socialSecurityDeduct = emp.social_security ? baseSalary * 0.075 : 0;

    let bonusTotal = 0;
    let deductionTotal = 0;

    for (const bd of empBonuses) {
      if (bd.type === 'bonus') bonusTotal += parseFloat(bd.amount) || 0;
      else if (bd.type === 'deduction') deductionTotal += parseFloat(bd.amount) || 0;
    }

    const netSalary = baseSalary + totalAdjustment - socialSecurityDeduct + bonusTotal - deductionTotal;
    const requiredHours = Math.max(0, (workdays.length - paidLeaveDays) * reqHours);
    const hourDiff = totalHours - requiredHours;

    let status = 'Full Attendance';
    if (dailyBreakdown.some((d) => d.status === 'absent')) status = 'Absent';
    else if (totalAdjustment < 0) status = 'Has Deductions';
    else if (totalAdjustment > 0) status = 'Has Extras';

    return {
      employee_id: emp.employee_id,
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

function calculateHoursPayroll(employees, attendanceMap, settings, bonusesMap, leaveMap, period) {
  const reqHours = parseFloat(settings.req_hours) || 8;
  const monthDays = parseFloat(settings.month_days) || 26;
  const deductionRate = parseFloat(settings.deduction_rate) || 1.0;
  const extraRate = parseFloat(settings.extra_rate) || 1.0;
  const baseRequiredHours = monthDays * reqHours;
  const { month, year } = period;

  return employees.map((emp) => {
    const baseSalary = parseFloat(emp.base_salary) || 0;
    const hourlyRate = baseRequiredHours > 0 ? baseSalary / baseRequiredHours : 0;
    const empAttendance = attendanceMap[emp.employee_id] || {};
    const empBonuses = bonusesMap[emp.employee_id] || [];
    const empLeaves = (leaveMap && leaveMap[emp.employee_id]) || {};

    const paidLeaveDays = Object.entries(empLeaves).reduce((count, [dateKey, type]) => {
      if (type !== 'paid') return count;

      const d = new Date(dateKey);

      if (Number.isNaN(d.getTime())) return count;
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return count;

      return count + 1;
    }, 0);

    const requiredHours = Math.max(0, baseRequiredHours - paidLeaveDays * reqHours);

    let totalHours = 0;

    for (const [dateKey, record] of Object.entries(empAttendance)) {
      if (empLeaves[dateKey]) continue;
      if (!hasValidClock(record)) continue;
      totalHours += parseFloat(record.hours_worked) || 0;
    }

    const diff = totalHours - requiredHours;

    let adjustment = 0;

    if (diff < 0) {
      adjustment = diff * hourlyRate * deductionRate;
    } else if (diff > 0) {
      adjustment = diff * hourlyRate * extraRate;
    }

    const socialSecurityDeduct = emp.social_security ? baseSalary * 0.075 : 0;

    let bonusTotal = 0;
    let deductionTotal = 0;

    for (const bd of empBonuses) {
      if (bd.type === 'bonus') bonusTotal += parseFloat(bd.amount) || 0;
      else if (bd.type === 'deduction') deductionTotal += parseFloat(bd.amount) || 0;
    }

    const netSalary = baseSalary + adjustment - socialSecurityDeduct + bonusTotal - deductionTotal;

    let status = 'Full Attendance';
    if (diff < 0) status = 'Has Deductions';
    else if (diff > 0) status = 'Has Extras';
    if (totalHours === 0 && paidLeaveDays === 0) status = 'Absent';

    return {
      employee_id: emp.employee_id,
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

// POST /api/payroll/calculate
router.post('/calculate', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { month, year } = req.body;
  const now = new Date();
  const periodMonth = month || now.getMonth() + 1;
  const periodYear = year || now.getFullYear();

  try {
    const companyId = getCompanyId(req);

    const settingsResult = await pool.query(
      'SELECT * FROM company_settings WHERE company_id = $1 LIMIT 1',
      [companyId]
    );

    if (settingsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Settings not configured' });
    }

    const settings = settingsResult.rows[0];
    const mode = settings.system_mode || 'daily';

    const employeesResult = await pool.query(
      `SELECT *
       FROM employees
       WHERE (system_mode = $1 OR system_mode IS NULL)
         AND company_id = $2
       ORDER BY name ASC`,
      [mode, companyId]
    );

    const employees = employeesResult.rows;

    if (employees.length === 0) {
      return res.status(400).json({ error: 'No employees found' });
    }

    const attendanceResult = await pool.query(
      `SELECT *
       FROM attendance_records
       WHERE EXTRACT(MONTH FROM work_date) = $1
         AND EXTRACT(YEAR FROM work_date) = $2
         AND (system_mode = $3 OR system_mode IS NULL)
         AND company_id = $4`,
      [periodMonth, periodYear, mode, companyId]
    );

    const periodStart = new Date(periodYear, periodMonth - 1, 1);
    const periodEnd = new Date(periodYear, periodMonth, 0);
    const yearStart = new Date(periodYear, 0, 1);

    const leaveResult = await pool.query(
      `SELECT *
       FROM leave_requests
       WHERE status = 'approved'
         AND start_date <= $2
         AND COALESCE(end_date, start_date) >= $1
         AND company_id = $3`,
      [yearStart, periodEnd, companyId]
    );

    const leaveTotalsResult = await pool.query(
      `SELECT employee_id, annual_total, sick_total
       FROM leave_balances
       WHERE year = $1
         AND company_id = $2`,
      [periodYear, companyId]
    );

    const totalsMap = leaveTotalsResult.rows.reduce((acc, row) => {
      if (!row.employee_id) return acc;

      acc[row.employee_id] = {
        annual_total: row.annual_total,
        sick_total: row.sick_total,
      };

      return acc;
    }, {});

    const leaveMap = buildLeaveMap(leaveResult.rows, periodStart, periodEnd, totalsMap);

    const attendanceMap = {};

    for (const record of attendanceResult.rows) {
      if (!attendanceMap[record.employee_id]) {
        attendanceMap[record.employee_id] = {};
      }

      const dateKey = record.work_date instanceof Date
        ? record.work_date.toISOString().substring(0, 10)
        : String(record.work_date).substring(0, 10);

      attendanceMap[record.employee_id][dateKey] = record;
    }

    const bonusesResult = await pool.query(
      `SELECT *
       FROM bonuses_deductions
       WHERE period_month = $1
         AND period_year = $2
         AND (system_mode = $3 OR system_mode IS NULL)
         AND company_id = $4`,
      [periodMonth, periodYear, mode, companyId]
    );

    const bonusesMap = {};

    for (const bd of bonusesResult.rows) {
      if (!bonusesMap[bd.employee_id]) bonusesMap[bd.employee_id] = [];
      bonusesMap[bd.employee_id].push(bd);
    }

    let payrollResults;

    if (settings.system_mode === 'hours') {
      payrollResults = calculateHoursPayroll(
        employees,
        attendanceMap,
        settings,
        bonusesMap,
        leaveMap,
        { month: periodMonth, year: periodYear }
      );
    } else {
      payrollResults = calculateDailyPayroll(
        employees,
        attendanceMap,
        settings,
        bonusesMap,
        { month: periodMonth, year: periodYear },
        leaveMap
      );
    }

    await pool.query(
      `DELETE FROM payroll_records
       WHERE period_month = $1
         AND period_year = $2
         AND (system_mode = $3 OR system_mode IS NULL)
         AND company_id = $4`,
      [periodMonth, periodYear, mode, companyId]
    );

    for (const pr of payrollResults) {
      await pool.query(
        `INSERT INTO payroll_records (
          employee_id,
          period_month,
          period_year,
          base_salary,
          total_hours,
          required_hours,
          hour_diff,
          adjustment,
          social_security_deduct,
          bonus_total,
          deduction_total,
          net_salary,
          status,
          daily_breakdown,
          system_mode,
          company_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          pr.employee_id,
          periodMonth,
          periodYear,
          pr.base_salary,
          pr.total_hours,
          pr.required_hours,
          pr.hour_diff,
          pr.adjustment,
          pr.social_security_deduct,
          pr.bonus_total,
          pr.deduction_total,
          pr.net_salary,
          pr.status,
          pr.daily_breakdown ? JSON.stringify(pr.daily_breakdown) : null,
          mode,
          companyId,
        ]
      );
    }

    res.json({
      period_month: periodMonth,
      period_year: periodYear,
      system_mode: settings.system_mode,
      results: payrollResults,
    });
  } catch (err) {
    console.error('POST /api/payroll/calculate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payroll/period?month=&year=
router.get('/period', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const periodMonth = parseInt(req.query.month, 10);
  const periodYear = parseInt(req.query.year, 10);

  if (!periodMonth || !periodYear) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const result = await pool.query(
      `SELECT pr.*, e.name, e.social_security
       FROM payroll_records pr
       LEFT JOIN employees e
         ON pr.employee_id = e.employee_id
        AND (e.system_mode = $3 OR e.system_mode IS NULL)
        AND e.company_id = $4
       WHERE pr.period_month = $1
         AND pr.period_year = $2
         AND (pr.system_mode = $3 OR pr.system_mode IS NULL)
         AND pr.company_id = $4
       ORDER BY e.name ASC`,
      [periodMonth, periodYear, mode, companyId]
    );

    res.json({
      period_month: periodMonth,
      period_year: periodYear,
      system_mode: mode,
      results: result.rows,
    });
  } catch (err) {
    console.error('GET /api/payroll/period error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payroll/period-employees?month=&year=
router.get('/period-employees', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const periodMonth = parseInt(req.query.month, 10);
  const periodYear = parseInt(req.query.year, 10);

  if (!periodMonth || !periodYear) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const result = await pool.query(
      `WITH att AS (
         SELECT DISTINCT ar.employee_id
         FROM attendance_records ar
         WHERE EXTRACT(MONTH FROM ar.work_date) = $1
           AND EXTRACT(YEAR FROM ar.work_date) = $2
           AND (ar.system_mode = $3 OR ar.system_mode IS NULL)
           AND ar.company_id = $4
       ),
       pr AS (
         SELECT DISTINCT employee_id
         FROM payroll_records
         WHERE period_month = $1
           AND period_year = $2
           AND (system_mode = $3 OR system_mode IS NULL)
           AND company_id = $4
       ),
       emp_ids AS (
         SELECT employee_id FROM att
         UNION
         SELECT employee_id FROM pr
       )
       SELECT e.employee_id, e.name
       FROM emp_ids ids
       LEFT JOIN employees e
         ON ids.employee_id = e.employee_id
        AND (e.system_mode = $3 OR e.system_mode IS NULL)
        AND e.company_id = $4
       ORDER BY e.name ASC`,
      [periodMonth, periodYear, mode, companyId]
    );

    res.json(result.rows.filter((r) => r.employee_id));
  } catch (err) {
    console.error('GET /api/payroll/period-employees error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payroll/employee-activity?employee_id=&month=&year=
router.get('/employee-activity', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  const { employee_id } = req.query;
  const periodMonth = parseInt(req.query.month, 10);
  const periodYear = parseInt(req.query.year, 10);

  if (!employee_id || !periodMonth || !periodYear) {
    return res.status(400).json({ error: 'employee_id, month and year are required' });
  }

  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const employeeResult = await pool.query(
      `SELECT employee_id, name, base_salary, social_security
       FROM employees
       WHERE employee_id = $1
         AND (system_mode = $2 OR system_mode IS NULL)
         AND company_id = $3
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [employee_id, mode, companyId]
    );

    const payrollResult = await pool.query(
      `SELECT *
       FROM payroll_records
       WHERE employee_id = $1
         AND period_month = $2
         AND period_year = $3
         AND (system_mode = $4 OR system_mode IS NULL)
         AND company_id = $5
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [employee_id, periodMonth, periodYear, mode, companyId]
    );

    const attendanceResult = await pool.query(
      `SELECT work_date, clock_in, clock_out, hours_worked
       FROM attendance_records
       WHERE employee_id = $1
         AND EXTRACT(MONTH FROM work_date) = $2
         AND EXTRACT(YEAR FROM work_date) = $3
         AND (system_mode = $4 OR system_mode IS NULL)
         AND company_id = $5
       ORDER BY work_date ASC`,
      [employee_id, periodMonth, periodYear, mode, companyId]
    );

    const attendanceRows = (attendanceResult.rows || []).map((row) => ({
      ...row,
      hours_worked: hasValidClock(row) ? row.hours_worked : 0,
    }));

    const bonusResult = await pool.query(
      `SELECT *
       FROM bonuses_deductions
       WHERE employee_id = $1
         AND period_month = $2
         AND period_year = $3
         AND (system_mode = $4 OR system_mode IS NULL)
         AND company_id = $5
       ORDER BY created_at ASC`,
      [employee_id, periodMonth, periodYear, mode, companyId]
    );

    res.json({
      employee: employeeResult.rows[0] || { employee_id, name: employee_id },
      payroll: payrollResult.rows[0] || null,
      attendance: attendanceRows,
      bonuses: bonusResult.rows || [],
    });
  } catch (err) {
    console.error('GET /api/payroll/employee-activity error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payroll/latest
router.get('/latest', requireAuth, requireRole('owner', 'hr', 'employee'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);
    const isEmployee = req.user.role === 'employee';
    const employeeNumber = req.user.employeeNumber;

    const periodResult = await pool.query(
      `SELECT period_month, period_year
       FROM payroll_records
       WHERE (system_mode = $1 OR system_mode IS NULL)
         AND company_id = $2
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [mode, companyId]
    );

    if (periodResult.rows.length === 0) {
      return res.json({ results: [], period_month: null, period_year: null });
    }

    const { period_month, period_year } = periodResult.rows[0];

    const values = [period_month, period_year, mode, companyId];
    let employeeFilter = '';

    if (isEmployee) {
      if (!employeeNumber) {
        return res.json({
          period_month,
          period_year,
          system_mode: mode,
          results: [],
        });
      }

      employeeFilter = ' AND pr.employee_id = $5';
      values.push(employeeNumber);
    }

    const result = await pool.query(
      `SELECT pr.*, e.name, e.social_security
       FROM payroll_records pr
       LEFT JOIN employees e
         ON pr.employee_id = e.employee_id
        AND (e.system_mode = $3 OR e.system_mode IS NULL)
        AND e.company_id = $4
       WHERE pr.period_month = $1
         AND pr.period_year = $2
         AND (pr.system_mode = $3 OR pr.system_mode IS NULL)
         AND pr.company_id = $4
         ${employeeFilter}
       ORDER BY e.name ASC`,
      values
    );

    res.json({
      period_month,
      period_year,
      system_mode: mode,
      results: result.rows,
    });
  } catch (err) {
    console.error('GET /api/payroll/latest error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payroll/history
router.get('/history', requireAuth, requireRole('owner', 'hr'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const mode = await getSystemMode(companyId);

    const result = await pool.query(
      `SELECT period_month,
              period_year,
              COUNT(*) as employee_count,
              SUM(net_salary) as total_net,
              SUM(base_salary) as total_base,
              MAX(calculated_at) as calculated_at
       FROM payroll_records
       WHERE (system_mode = $1 OR system_mode IS NULL)
         AND company_id = $2
       GROUP BY period_month, period_year
       ORDER BY period_year DESC, period_month DESC`,
      [mode, companyId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/payroll/history error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;