"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Wallet, DollarSign, TrendingDown, Gift, Shield, AlertTriangle, MapPin, Bell, Calendar, CheckSquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import StatCard from "@/components/StatCard";
import api from "@/lib/api";

function formatCurrency(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusBadge(status: string, t: (k: any) => string) {
  const map: Record<string, { cls: string; label: string }> = {
    "Full Attendance": { cls: "badge-green", label: t("fullAttendance") },
    "Has Deductions": { cls: "badge-red", label: t("hasDeductions") },
    "Has Extras": { cls: "badge-blue", label: t("hasExtras") },
    Absent: { cls: "badge-gray", label: t("absent") },
  };
  const info = map[status] || { cls: "badge-gray", label: status };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

function buildCopilotInsights(payroll: any[], isRTL: boolean) {
  const label = (ar: string, en: string) => (isRTL ? ar : en);
  const rows = payroll.map((r) => ({ ...r, net_salary: parseFloat(r.net_salary) || 0, hour_diff: parseFloat(r.hour_diff) || 0, adjustment: parseFloat(r.adjustment) || 0, deduction_total: parseFloat(r.deduction_total) || 0, social_security_deduct: parseFloat(r.social_security_deduct) || 0 }));

  if (!rows.length) return [
    { question: label("مين أكثر قسم عنده غياب؟", "Who has the most absence?"), answer: label("لسا ما في كشف رواتب محسوب. ارفع ملفات الحضور والرواتب ثم احسب الرواتب.", "No payroll has been calculated yet. Upload attendance and salary files, then calculate payroll.") },
    { question: label("مين متوقع يترك الشركة؟", "Who may be at risk of leaving?"), answer: label("أحتاج بيانات رواتب وحضور أولاً حتى أعطي مؤشر منطقي.", "I need payroll and attendance data first before giving a useful signal.") },
    { question: label("ليش الإنتاج نازل؟", "Why is productivity down?"), answer: label("بعد حساب الرواتب أقدر أربط فرق الساعات والغياب والخصومات.", "After payroll is calculated, I can connect hour gaps, absence, and deductions.") },
  ];

  const biggestShortfall = [...rows].sort((a, b) => a.hour_diff - b.hour_diff)[0];
  const biggestDeduction = [...rows].sort((a, b) => (Math.abs(b.adjustment) + b.deduction_total + b.social_security_deduct) - (Math.abs(a.adjustment) + a.deduction_total + a.social_security_deduct))[0];
  const lowestNet = [...rows].sort((a, b) => a.net_salary - b.net_salary)[0];
  const highestNet = [...rows].sort((a, b) => b.net_salary - a.net_salary)[0];
  const totalNet = rows.reduce((s, r) => s + r.net_salary, 0);
  const totalDeductions = rows.reduce((s, r) => s + Math.max(0, -r.adjustment) + r.deduction_total + r.social_security_deduct, 0);
  const affected = rows.filter((r) => r.hour_diff < 0 || r.deduction_total > 0 || r.social_security_deduct > 0).length;

  return [
    { question: label("مين أكثر موظف عنده غياب/نقص ساعات؟", "Who has the highest absence or hour gap?"), answer: label(`${biggestShortfall.name} عنده فرق ساعات ${biggestShortfall.hour_diff.toFixed(2)}.`, `${biggestShortfall.name} has an hour gap of ${biggestShortfall.hour_diff.toFixed(2)}.`) },
    { question: label("مين عليه أعلى خصومات؟", "Who has the highest deductions?"), answer: label(`${biggestDeduction.name} عليه أعلى أثر خصومات.`, `${biggestDeduction.name} has the highest deduction impact.`) },
    { question: label("كم صافي الرواتب المتوقع؟", "What is expected net payroll?"), answer: label(`صافي الرواتب الحالي ${formatCurrency(totalNet)} مع خصومات ${formatCurrency(totalDeductions)} على ${affected} موظف.`, `Net payroll is ${formatCurrency(totalNet)} with ${formatCurrency(totalDeductions)} in deductions across ${affected} employees.`) },
    { question: label("مين أعلى وأقل صافي راتب؟", "Who has the highest and lowest net pay?"), answer: label(`أعلى: ${highestNet.name} (${formatCurrency(highestNet.net_salary)}). أقل: ${lowestNet.name} (${formatCurrency(lowestNet.net_salary)}).`, `Highest: ${highestNet.name} (${formatCurrency(highestNet.net_salary)}). Lowest: ${lowestNet.name} (${formatCurrency(lowestNet.net_salary)}).`) },
  ];
}

export default function DashboardPage() {
  const { t, isRTL } = useLanguage();
  const [payroll, setPayroll] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [remoteAssignments, setRemoteAssignments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get("/payroll/latest"),
      api.get("/employees"),
      api.get("/remote-assignments"),
      api.get("/leaves"),
      api.get("/tasks"),
      api.get("/announcements"),
      api.get("/settings"),
    ])
      .then(([prRes, empRes, raRes, leavesRes, tasksRes, annRes, setRes]) => {
        setPayroll(prRes.data.results || []);
        setEmployees(empRes.data || []);
        setRemoteAssignments(raRes.data || []);
        setLeaves(leavesRes.data || []);
        setTasks(tasksRes.data || []);
        setAnnouncements(annRes.data || []);
        setSettings(setRes.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => ({
    totalBase: payroll.reduce((s, r) => s + (parseFloat(r.base_salary) || 0), 0),
    totalNet: payroll.reduce((s, r) => s + (parseFloat(r.net_salary) || 0), 0),
    totalDeductions: payroll.reduce((s, r) => s + (parseFloat(r.deduction_total) || 0), 0),
    totalBonuses: payroll.reduce((s, r) => s + (parseFloat(r.bonus_total) || 0), 0),
    totalSS: payroll.reduce((s, r) => s + (parseFloat(r.social_security_deduct) || 0), 0),
  }), [payroll]);

  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const openTasks = tasks.filter((t) => t.status !== "completed").length;
  const remoteWorkEmployees = useMemo(() => {
    const seen = new Set<string>();
    return remoteAssignments.filter((a) => { const k = `${a.emp_id}|${a.start_date}|${a.end_date}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 5);
  }, [remoteAssignments]);

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t("dashboard")}</h2>
          <p className="page-subtitle">{settings?.company_name || "PayNest"} • HR, payroll, attendance, and employee requests</p>
        </div>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <StatCard title={t("totalEmployees")} value={employees.length} icon={Users} color="brand" />
        <StatCard title={t("totalBaseSalary")} value={formatCurrency(totals.totalBase)} icon={Wallet} color="blue" />
        <StatCard title={t("totalNetPay")} value={formatCurrency(totals.totalNet)} icon={DollarSign} color="green" />
        <StatCard title={t("totalDeductions")} value={formatCurrency(totals.totalDeductions)} icon={TrendingDown} color="red" />
        <StatCard title={t("totalBonuses")} value={formatCurrency(totals.totalBonuses)} icon={Gift} color="orange" />
        <StatCard title={t("ssDeductions")} value={formatCurrency(totals.totalSS)} icon={Shield} color="purple" />
        <StatCard title={isRTL ? "إجازات معلقة" : "Pending Leaves"} value={pendingLeaves} icon={Calendar} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><div className="card-title"><MapPin size={16} className="text-brand-600" />{t("remoteWorkStatus")}</div></div>
          {remoteWorkEmployees.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
            <div className="space-y-3">
              {remoteWorkEmployees.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">{a.name?.[0]?.toUpperCase() || a.emp_id?.[0]}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{t("working")}</div>
                      <div className="text-xs text-slate-500">{a.name} • {a.emp_id}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-slate-900">{new Date(a.startDate || a.start_date).toLocaleDateString()} → {new Date(a.endDate || a.end_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title"><Bell size={16} className="text-brand-600" />{t("announcements")}</div></div>
          {announcements.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
            <div className="space-y-3">
              {announcements.slice(0, 5).map((ann) => (
                <div key={ann.id} className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="text-sm font-semibold text-slate-900 mb-1">{ann.title}</div>
                  <div className="text-xs text-slate-600 mb-2">{ann.message}</div>
                  <div className="text-xs text-slate-400">{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : "-"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title"><Wallet size={16} className="text-brand-600" />{t("recentPayroll")}</div></div>
        {payroll.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>{t("name")}</th><th className="text-right">{t("baseSalary")}</th><th className="text-right">{t("netSalary")}</th><th>{t("status")}</th></tr></thead>
              <tbody>
                {payroll.slice(0, 8).map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-medium text-slate-900">{row.name}</td>
                    <td className="text-right font-mono">{formatCurrency(row.base_salary)}</td>
                    <td className="text-right font-mono font-semibold text-brand-700">{formatCurrency(row.net_salary)}</td>
                    <td>{getStatusBadge(row.status, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
