const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET || 'paynest_secret_change_later';

function getCompanyId(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) return 1;

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.companyId || 1;
  } catch {
    return 1;
  }
}

async function getSystemMode(companyId) {
  const r = await pool.query(
    'SELECT system_mode FROM company_settings WHERE company_id = $1 ORDER BY id LIMIT 1',
    [companyId]
  );
  return r.rows[0]?.system_mode || 'daily';
}

function n(value) {
  return parseFloat(value) || 0;
}

function money(value) {
  return n(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

function getBreakdown(row) {
  if (!row?.daily_breakdown) return [];
  if (Array.isArray(row.daily_breakdown)) return row.daily_breakdown;
  if (typeof row.daily_breakdown === 'object') return row.daily_breakdown;
  try {
    return JSON.parse(row.daily_breakdown);
  } catch {
    return [];
  }
}

function enrichPayroll(rows) {
  return rows.map((row) => {
    const breakdown = getBreakdown(row);
    const absentDays = breakdown.filter((d) => d.status === 'absent').length;
    const deductionImpact =
      Math.max(0, -n(row.adjustment)) +
      n(row.deduction_total) +
      n(row.social_security_deduct);

    return {
      ...row,
      name: row.name || row.employee_id,
      base_salary_num: n(row.base_salary),
      total_hours_num: n(row.total_hours),
      required_hours_num: n(row.required_hours),
      hour_diff_num: n(row.hour_diff),
      adjustment_num: n(row.adjustment),
      bonus_total_num: n(row.bonus_total),
      deduction_total_num: n(row.deduction_total),
      social_security_deduct_num: n(row.social_security_deduct),
      net_salary_num: n(row.net_salary),
      absent_days_num: absentDays,
      deduction_impact_num: deductionImpact,
    };
  });
}

function top(rows, selector, dir = 'desc') {
  if (!rows.length) return null;

  return [...rows].sort((a, b) => {
    const av = selector(a);
    const bv = selector(b);
    return dir === 'asc' ? av - bv : bv - av;
  })[0];
}

function findEmployee(question, payroll, employees) {
  const q = normalizeText(question);

  return [...payroll, ...employees].find((emp) => {
    const name = normalizeText(emp.name);
    const id = normalizeText(emp.employee_id);
    return (name && q.includes(name)) || (id && q.includes(id));
  });
}

async function loadCopilotData(companyId) {
  const mode = await getSystemMode(companyId);

  const periodResult = await pool.query(
    `SELECT period_month, period_year
     FROM payroll_records
     WHERE (system_mode = $1 OR system_mode IS NULL)
       AND company_id = $2
     ORDER BY calculated_at DESC
     LIMIT 1`,
    [mode, companyId]
  );

  const period = periodResult.rows[0] || {
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
  };

  const [payrollResult, employeesResult, bonusesResult, leavesResult, balancesResult] =
    await Promise.all([
      pool.query(
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
        [period.period_month, period.period_year, mode, companyId]
      ),

      pool.query(
        `SELECT *
         FROM employees
         WHERE (system_mode = $1 OR system_mode IS NULL)
           AND employee_id IS NOT NULL
           AND company_id = $2
         ORDER BY name ASC`,
        [mode, companyId]
      ),

      pool.query(
        `SELECT *
         FROM bonuses_deductions
         WHERE period_month = $1
           AND period_year = $2
           AND (system_mode = $3 OR system_mode IS NULL)
           AND company_id = $4
         ORDER BY created_at DESC`,
        [period.period_month, period.period_year, mode, companyId]
      ),

      pool.query(
        `SELECT *
         FROM leave_requests
         WHERE EXTRACT(YEAR FROM start_date) = $1
           AND company_id = $2
         ORDER BY created_at DESC`,
        [period.period_year, companyId]
      ),

      pool.query(
        `SELECT *
         FROM leave_balances
         WHERE year = $1
           AND company_id = $2`,
        [period.period_year, companyId]
      ),
    ]);

  return {
    mode,
    period,
    payroll: enrichPayroll(payrollResult.rows || []),
    employees: employeesResult.rows || [],
    bonuses: bonusesResult.rows || [],
    leaves: leavesResult.rows || [],
    balances: balancesResult.rows || [],
  };
}

function answerQuestion(question, data) {
  const q = normalizeText(question);
  const { period, payroll, employees, bonuses, leaves, balances } = data;
  const periodLabel = `${period.period_month}/${period.period_year}`;

  if (!payroll.length) {
    return `لسا ما في كشف رواتب محسوب. ارفع ملفات الحضور والرواتب ثم احسب الرواتب، وبعدها بقدر أجاوب على الغياب والخصومات والصافي.`;
  }

  const employee = findEmployee(question, payroll, employees);

  if (
    employee &&
    (q.includes('كم') ||
      q.includes('راتب') ||
      q.includes('صافي') ||
      q.includes('خصم') ||
      q.includes('غياب'))
  ) {
    const row = payroll.find((p) => p.employee_id === employee.employee_id) || employee;

    return `${row.name}: الراتب الأساسي ${money(row.base_salary_num || row.base_salary)}، صافي الراتب ${money(row.net_salary_num || row.net_salary)}، فرق الساعات ${(
      row.hour_diff_num || 0
    ).toFixed(2)}، وإجمالي أثر الخصومات/الضمان ${money(
      row.deduction_impact_num || 0
    )} لفترة ${periodLabel}.`;
  }

  if (
    q.includes('غياب') ||
    q.includes('غايب') ||
    q.includes('نقص') ||
    q.includes('ساعات') ||
    q.includes('absence')
  ) {
    const worst = top(
      payroll,
      (row) => row.absent_days_num * 1000 + Math.max(0, -row.hour_diff_num)
    );

    return `أكثر موظف عنده غياب/نقص ساعات هو ${worst.name}: ${worst.absent_days_num} أيام غياب وفرق ساعات ${worst.hour_diff_num.toFixed(
      2
    )} في فترة ${periodLabel}.`;
  }

  if (q.includes('خصم') || q.includes('خصومات') || q.includes('deduct')) {
    const worst = top(payroll, (row) => row.deduction_impact_num);
    const total = payroll.reduce((sum, row) => sum + row.deduction_impact_num, 0);

    return `أعلى أثر خصومات عند ${worst.name}: ${money(
      worst.deduction_impact_num
    )}. إجمالي أثر الخصومات والضمان على كل الموظفين ${money(
      total
    )} في فترة ${periodLabel}.`;
  }

  if (q.includes('مكاف') || q.includes('bonus') || q.includes('جائزه') || q.includes('جوائز')) {
    const total = bonuses
      .filter((item) => item.type === 'bonus')
      .reduce((sum, item) => sum + n(item.amount), 0);

    const count = bonuses.filter((item) => item.type === 'bonus').length;
    const best = top(payroll, (row) => row.bonus_total_num);

    return `إجمالي المكافآت لهذا الكشف ${money(total)} عبر ${count} عملية. أعلى مكافآت على الكشف عند ${best.name}: ${money(
      best.bonus_total_num
    )}.`;
  }

  if (q.includes('ضمان') || q.includes('social') || q.includes('security')) {
    const total = payroll.reduce((sum, row) => sum + row.social_security_deduct_num, 0);
    const insured = payroll.filter((row) => row.social_security || row.social_security_deduct_num > 0).length;

    return `عدد الموظفين المشمولين بالضمان ${insured}، وإجمالي خصم الضمان ${money(
      total
    )} لفترة ${periodLabel}.`;
  }

  if (q.includes('صافي') || q.includes('راتب') || q.includes('salary') || q.includes('payroll')) {
    const totalNet = payroll.reduce((sum, row) => sum + row.net_salary_num, 0);
    const totalBase = payroll.reduce((sum, row) => sum + row.base_salary_num, 0);
    const highest = top(payroll, (row) => row.net_salary_num);
    const lowest = top(payroll, (row) => row.net_salary_num, 'asc');

    return `إجمالي الرواتب الأساسية ${money(totalBase)}، وصافي الرواتب المتوقع ${money(
      totalNet
    )}. أعلى صافي: ${highest.name} (${money(highest.net_salary_num)}). أقل صافي: ${lowest.name
      } (${money(lowest.net_salary_num)}).`;
  }

  if (q.includes('اجازه') || q.includes('اجازات') || q.includes('leave')) {
    const pending = leaves.filter((leave) => leave.status === 'pending').length;
    const approved = leaves.filter((leave) => leave.status === 'approved').length;
    const mostUsed = top(balances, (row) => n(row.annual_used) + n(row.sick_used));

    const usedText = mostUsed
      ? ` أكثر موظف مستخدم للإجازات هو ${mostUsed.employee_id}: ${n(mostUsed.annual_used) + n(mostUsed.sick_used)
      } يوم.`
      : '';

    return `طلبات الإجازات في سنة ${period.period_year}: ${pending} قيد الانتظار و${approved} موافق عليها.${usedText}`;
  }

  if (
    q.includes('يترك') ||
    q.includes('استقال') ||
    q.includes('خطر') ||
    q.includes('risk') ||
    q.includes('leave company')
  ) {
    const risk = [...payroll].sort((a, b) => {
      const aScore = Math.max(0, -a.hour_diff_num) + a.deduction_impact_num / 50;
      const bScore = Math.max(0, -b.hour_diff_num) + b.deduction_impact_num / 50;
      return bScore - aScore;
    })[0];

    return `كمؤشر فقط وليس تنبؤ أكيد: ${risk.name} يحتاج متابعة، لأنه عنده فرق ساعات ${risk.hour_diff_num.toFixed(
      2
    )} وأثر خصومات/ضمان ${money(
      risk.deduction_impact_num
    )}. الأفضل مراجعة السبب معه قبل اعتبارها مخاطرة ترك.`;
  }

  if (q.includes('انتاج') || q.includes('نازل') || q.includes('productivity')) {
    const affected = payroll.filter((row) => row.hour_diff_num < 0).length;
    const totalGap = payroll.reduce((sum, row) => sum + Math.min(0, row.hour_diff_num), 0);
    const worst = top(payroll, (row) => Math.max(0, -row.hour_diff_num));

    return `أقوى إشارة لانخفاض الإنتاجية هي نقص الساعات: ${affected} موظف عندهم نقص، بإجمالي ${Math.abs(
      totalGap
    ).toFixed(2)} ساعة. أكبر فجوة عند ${worst.name}: ${worst.hour_diff_num.toFixed(2)} ساعة.`;
  }

  const totalNet = payroll.reduce((sum, row) => sum + row.net_salary_num, 0);
  const totalGap = payroll.reduce((sum, row) => sum + Math.min(0, row.hour_diff_num), 0);

  return `أقدر أجاوب على الرواتب، الصافي، الخصومات، الضمان، الغياب، الإجازات، المكافآت، ومؤشرات الإنتاجية. ملخص فترة ${periodLabel}: ${payroll.length
    } موظفين، صافي الرواتب ${money(totalNet)}، ونقص الساعات الإجمالي ${Math.abs(totalGap).toFixed(2)}.`;
}

router.post('/ask', async (req, res) => {
  const question = String(req.body?.question || '').trim();

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const companyId = getCompanyId(req);
    const data = await loadCopilotData(companyId);

    res.json({
      question,
      answer: answerQuestion(question, data),
      period_month: data.period.period_month,
      period_year: data.period.period_year,
      system_mode: data.mode,
      company_id: companyId,
    });
  } catch (err) {
    console.error('POST /api/copilot/ask error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;