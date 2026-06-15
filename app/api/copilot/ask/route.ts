import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

function n(value: unknown): number {
  return parseFloat(String(value ?? 0)) || 0;
}

function money(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

function getBreakdown(row: any): any[] {
  if (!row?.dailyBreakdown) return [];
  if (Array.isArray(row.dailyBreakdown)) return row.dailyBreakdown;
  if (typeof row.dailyBreakdown === "object") return row.dailyBreakdown as any[];
  try { return JSON.parse(row.dailyBreakdown); } catch { return []; }
}

function enrichPayroll(rows: any[]): any[] {
  return rows.map((row) => {
    const breakdown = getBreakdown(row);
    const absentDays = breakdown.filter((d: any) => d.status === "absent").length;
    const deductionImpact =
      Math.max(0, -n(row.adjustment)) + n(row.deductionTotal) + n(row.socialSecurityDeduct);
    return {
      ...row,
      name: row.name || row.employeeId,
      base_salary_num: n(row.baseSalary),
      total_hours_num: n(row.totalHours),
      required_hours_num: n(row.requiredHours),
      hour_diff_num: n(row.hourDiff),
      adjustment_num: n(row.adjustment),
      bonus_total_num: n(row.bonusTotal),
      deduction_total_num: n(row.deductionTotal),
      social_security_deduct_num: n(row.socialSecurityDeduct),
      net_salary_num: n(row.netSalary),
      absent_days_num: absentDays,
      deduction_impact_num: deductionImpact,
    };
  });
}

function top(rows: any[], selector: (r: any) => number, dir: "asc" | "desc" = "desc"): any | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => {
    const av = selector(a), bv = selector(b);
    return dir === "asc" ? av - bv : bv - av;
  })[0];
}

function findEmployee(question: string, payroll: any[], employees: any[]): any | null {
  const q = normalizeText(question);
  return [...payroll, ...employees].find((emp) => {
    const name = normalizeText(emp.name);
    const id = normalizeText(emp.employeeId);
    return (name && q.includes(name)) || (id && q.includes(id));
  }) ?? null;
}

async function loadCopilotData(companyId: number) {
  const settings = await prisma.companySettings.findFirst({ where: { companyId } });
  const mode = settings?.systemMode ?? "daily";

  const latestRecord = await prisma.payrollRecord.findFirst({
    where: { companyId, systemMode: mode },
    orderBy: { calculatedAt: "desc" },
    select: { periodMonth: true, periodYear: true },
  });

  const period = latestRecord ?? { periodMonth: new Date().getMonth() + 1, periodYear: new Date().getFullYear() };

  const [payrollRows, employeeRows, bonusRows, leaveRows, balanceRows] = await Promise.all([
    prisma.payrollRecord.findMany({
      where: { companyId, periodMonth: period.periodMonth, periodYear: period.periodYear, systemMode: mode },
      orderBy: { employeeId: "asc" },
    }),
    prisma.employee.findMany({
      where: { companyId, systemMode: mode },
      orderBy: { name: "asc" },
    }),
    prisma.bonusDeduction.findMany({
      where: { companyId, periodMonth: period.periodMonth, periodYear: period.periodYear, systemMode: mode },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveRequest.findMany({
      where: { companyId, startDate: { gte: new Date(`${period.periodYear ?? 0}-01-01`), lt: new Date(`${(period.periodYear ?? 0) + 1}-01-01`) } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveBalance.findMany({
      where: { companyId, year: period.periodYear },
    }),
  ]);

  // Enrich payroll rows with employee names
  const empMap: Record<string, any> = {};
  for (const e of employeeRows) { if (e.employeeId) empMap[e.employeeId] = e; }
  const enrichedPayroll = payrollRows.map((p) => ({ ...p, name: (p.employeeId ? empMap[p.employeeId]?.name : null) ?? p.employeeId }));

  return {
    mode,
    period: { period_month: period.periodMonth, period_year: period.periodYear },
    payroll: enrichPayroll(enrichedPayroll),
    employees: employeeRows,
    bonuses: bonusRows,
    leaves: leaveRows,
    balances: balanceRows,
  };
}

function answerQuestion(question: string, data: ReturnType<typeof enrichPayroll> extends never ? any : any): string {
  const q = normalizeText(question);
  const { period, payroll, employees, bonuses, leaves, balances } = data;
  const periodLabel = `${period.period_month}/${period.period_year}`;

  if (!payroll.length) {
    return `لسا ما في كشف رواتب محسوب. ارفع ملفات الحضور والرواتب ثم احسب الرواتب، وبعدها بقدر أجاوب على الغياب والخصومات والصافي.`;
  }

  const employee = findEmployee(question, payroll, employees);

  if (employee && (q.includes("كم") || q.includes("راتب") || q.includes("صافي") || q.includes("خصم") || q.includes("غياب"))) {
    const row = payroll.find((p: any) => p.employeeId === employee.employeeId) || employee;
    return `${row.name}: الراتب الأساسي ${money(row.base_salary_num || n(row.baseSalary))}، صافي الراتب ${money(row.net_salary_num || n(row.netSalary))}، فرق الساعات ${(row.hour_diff_num || 0).toFixed(2)}، وإجمالي أثر الخصومات/الضمان ${money(row.deduction_impact_num || 0)} لفترة ${periodLabel}.`;
  }

  if (q.includes("غياب") || q.includes("غايب") || q.includes("نقص") || q.includes("ساعات") || q.includes("absence")) {
    const worst = top(payroll, (row) => row.absent_days_num * 1000 + Math.max(0, -row.hour_diff_num));
    return `أكثر موظف عنده غياب/نقص ساعات هو ${worst.name}: ${worst.absent_days_num} أيام غياب وفرق ساعات ${worst.hour_diff_num.toFixed(2)} في فترة ${periodLabel}.`;
  }

  if (q.includes("خصم") || q.includes("خصومات") || q.includes("deduct")) {
    const worst = top(payroll, (row) => row.deduction_impact_num);
    const total = payroll.reduce((sum: number, row: any) => sum + row.deduction_impact_num, 0);
    return `أعلى أثر خصومات عند ${worst.name}: ${money(worst.deduction_impact_num)}. إجمالي أثر الخصومات والضمان على كل الموظفين ${money(total)} في فترة ${periodLabel}.`;
  }

  if (q.includes("مكاف") || q.includes("bonus") || q.includes("جائزه") || q.includes("جوائز")) {
    const bonusList = bonuses.filter((item: any) => item.type === "bonus");
    const total = bonusList.reduce((sum: number, item: any) => sum + n(item.amount), 0);
    const best = top(payroll, (row) => row.bonus_total_num);
    return `إجمالي المكافآت لهذا الكشف ${money(total)} عبر ${bonusList.length} عملية. أعلى مكافآت على الكشف عند ${best.name}: ${money(best.bonus_total_num)}.`;
  }

  if (q.includes("ضمان") || q.includes("social") || q.includes("security")) {
    const total = payroll.reduce((sum: number, row: any) => sum + row.social_security_deduct_num, 0);
    const insured = payroll.filter((row: any) => row.socialSecurity || row.social_security_deduct_num > 0).length;
    return `عدد الموظفين المشمولين بالضمان ${insured}، وإجمالي خصم الضمان ${money(total)} لفترة ${periodLabel}.`;
  }

  if (q.includes("صافي") || q.includes("راتب") || q.includes("salary") || q.includes("payroll")) {
    const totalNet = payroll.reduce((sum: number, row: any) => sum + row.net_salary_num, 0);
    const totalBase = payroll.reduce((sum: number, row: any) => sum + row.base_salary_num, 0);
    const highest = top(payroll, (row) => row.net_salary_num);
    const lowest = top(payroll, (row) => row.net_salary_num, "asc");
    return `إجمالي الرواتب الأساسية ${money(totalBase)}، وصافي الرواتب المتوقع ${money(totalNet)}. أعلى صافي: ${highest.name} (${money(highest.net_salary_num)}). أقل صافي: ${lowest.name} (${money(lowest.net_salary_num)}).`;
  }

  if (q.includes("اجازه") || q.includes("اجازات") || q.includes("leave")) {
    const pending = leaves.filter((l: any) => l.status === "pending").length;
    const approved = leaves.filter((l: any) => l.status === "approved").length;
    const mostUsed = top(balances, (row) => n(row.annualUsed) + n(row.sickUsed));
    const usedText = mostUsed ? ` أكثر موظف مستخدم للإجازات هو ${mostUsed.employeeId}: ${n(mostUsed.annualUsed) + n(mostUsed.sickUsed)} يوم.` : "";
    return `طلبات الإجازات في سنة ${period.period_year}: ${pending} قيد الانتظار و${approved} موافق عليها.${usedText}`;
  }

  if (q.includes("يترك") || q.includes("استقال") || q.includes("خطر") || q.includes("risk")) {
    const risk = top(payroll, (row) => Math.max(0, -row.hour_diff_num) + row.deduction_impact_num / 50);
    return `كمؤشر فقط وليس تنبؤ أكيد: ${risk.name} يحتاج متابعة، لأنه عنده فرق ساعات ${risk.hour_diff_num.toFixed(2)} وأثر خصومات/ضمان ${money(risk.deduction_impact_num)}. الأفضل مراجعة السبب معه قبل اعتبارها مخاطرة ترك.`;
  }

  if (q.includes("انتاج") || q.includes("نازل") || q.includes("productivity")) {
    const affected = payroll.filter((row: any) => row.hour_diff_num < 0).length;
    const totalGap = payroll.reduce((sum: number, row: any) => sum + Math.min(0, row.hour_diff_num), 0);
    const worst = top(payroll, (row) => Math.max(0, -row.hour_diff_num));
    return `أقوى إشارة لانخفاض الإنتاجية هي نقص الساعات: ${affected} موظف عندهم نقص، بإجمالي ${Math.abs(totalGap).toFixed(2)} ساعة. أكبر فجوة عند ${worst.name}: ${worst.hour_diff_num.toFixed(2)} ساعة.`;
  }

  const totalNet = payroll.reduce((sum: number, row: any) => sum + row.net_salary_num, 0);
  const totalGap = payroll.reduce((sum: number, row: any) => sum + Math.min(0, row.hour_diff_num), 0);
  return `أقدر أجاوب على الرواتب، الصافي، الخصومات، الضمان، الغياب، الإجازات، المكافآت، ومؤشرات الإنتاجية. ملخص فترة ${periodLabel}: ${payroll.length} موظفين، صافي الرواتب ${money(totalNet)}، ونقص الساعات الإجمالي ${Math.abs(totalGap).toFixed(2)}.`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    // Copilot exposes company-wide payroll/salary data — restrict to admins.
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    const question = String(body?.question || "").trim();
    if (!question) throw new HttpError(400, "Question is required");

    const data = await loadCopilotData(session.companyId);

    return NextResponse.json({
      question,
      answer: answerQuestion(question, data),
      period_month: data.period.period_month,
      period_year: data.period.period_year,
      system_mode: data.mode,
      company_id: session.companyId,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
