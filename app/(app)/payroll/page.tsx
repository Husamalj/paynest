"use client";

import { useState, useEffect } from "react";
import { Zap, Download, ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, X, Calendar, Clock, Calculator } from "lucide-react";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import clsx from "clsx";

function formatCurrency(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusBadge(status: string, t: (k: any) => string) {
  const map: Record<string, { cls: string; label: string }> = { "Full Attendance": { cls: "badge-green", label: t("fullAttendance") }, "Has Deductions": { cls: "badge-red", label: t("hasDeductions") }, "Has Extras": { cls: "badge-blue", label: t("hasExtras") }, Absent: { cls: "badge-gray", label: t("absent") } };
  const info = map[status] || { cls: "badge-gray", label: status };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

export default function PayrollPage() {
  const { t, lang } = useLanguage();
  const now = new Date();
  const ar = lang === "ar";
  const months = ar ? MONTHS_AR : MONTHS_EN;
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear]   = useState(now.getFullYear());
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const loadPayroll = async (m: number, y: number) => {
    try {
      // Try period endpoint first (historical), fall back to latest if empty
      const periodRes = await api.get(`/payroll/period?month=${m}&year=${y}`).catch(() => ({ data: [] as any[] }));
      if (Array.isArray(periodRes.data) && periodRes.data.length > 0) {
        setPayroll(periodRes.data);
        return;
      }
      const latestRes = await api.get(`/payroll/latest?month=${m}&year=${y}`);
      setPayroll(latestRes.data?.results || []);
    } catch (err: any) { setError(err.message); }
  };

  useEffect(() => {
    setLoading(true);
    loadPayroll(periodMonth, periodYear).finally(() => setLoading(false));
  }, [periodMonth, periodYear]);

  const handleCalculate = async () => {
    setCalculating(true); setError(""); setSuccess("");
    try {
      await api.post("/payroll/calculate", { month: periodMonth, year: periodYear });
      setSuccess(`${t("calculationDone")} — ${months[periodMonth - 1]} ${periodYear}`);
      await loadPayroll(periodMonth, periodYear);
    } catch (err: any) { setError(err.message); }
    finally { setCalculating(false); }
  };

  const toggleExpand = (id: number) => {
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const totalNet = payroll.reduce((s, r) => s + (parseFloat(r.netSalary || r.net_salary) || 0), 0);
  const totalBase = payroll.reduce((s, r) => s + (parseFloat(r.baseSalary || r.base_salary) || 0), 0);

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("payroll")}</h2></div>
        <button className="btn btn-primary" onClick={handleCalculate} disabled={calculating}>
          {calculating ? <><span className="spinner" /> {t("calculating")}</> : <><Zap size={15} /> {t("calculate")}</>}
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")}><X size={14} /></button></div>}

      {payroll.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{t("totalBaseSalary")}</div><div className="text-xl font-bold text-slate-900">{formatCurrency(totalBase)}</div></div>
          <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{t("totalNetPay")}</div><div className="text-xl font-bold text-brand-700">{formatCurrency(totalNet)}</div></div>
          <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{t("totalEmployees")}</div><div className="text-xl font-bold text-slate-900">{payroll.length}</div></div>
        </div>
      )}

      <div className="card">
        <div className="card-header flex-wrap gap-2">
          <div className="card-title"><Calculator size={16} className="text-brand-600" />{t("recentPayroll")}</div>
          <div className="flex items-center gap-2 ms-auto">
            <select className="form-select text-sm h-8 py-0 w-32" value={periodMonth} onChange={(e) => setPeriodMonth(+e.target.value)}>
              {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select className="form-select text-sm h-8 py-0 w-24" value={periodYear} onChange={(e) => setPeriodYear(+e.target.value)}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        {payroll.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>{t("name")}</th>
                  <th className="text-right">{t("baseSalary")}</th>
                  <th className="text-right">{t("totalHours")}</th>
                  <th className="text-right">{t("hourDiff")}</th>
                  <th className="text-right">{t("adjustment")}</th>
                  <th className="text-right">{t("bonusTotal")}</th>
                  <th className="text-right">{t("deductionTotal")}</th>
                  <th className="text-right">{t("socialSecurityDeduct")}</th>
                  <th className="text-right">{t("netSalary")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map((row) => {
                  const isExp = expanded.has(row.id);
                  const breakdown = (() => { try { return typeof row.dailyBreakdown === "string" ? JSON.parse(row.dailyBreakdown) : (row.dailyBreakdown || row.daily_breakdown || []); } catch { return []; } })();
                  return [
                    <tr key={row.id} className="group cursor-pointer hover:bg-slate-50" onClick={() => toggleExpand(row.id)}>
                      <td className="pl-3 w-8">{breakdown?.length > 0 ? (isExp ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />) : null}</td>
                      <td className="font-medium">{row.name || row.employeeName}</td>
                      <td className="text-right font-mono">{formatCurrency(row.baseSalary || row.base_salary)}</td>
                      <td className="text-right font-mono">{parseFloat(row.totalHours || row.total_hours || 0).toFixed(2)}</td>
                      <td className={clsx("text-right font-mono", parseFloat(row.hourDiff || row.hour_diff || 0) < 0 ? "text-rose-600" : "text-emerald-600")}>{parseFloat(row.hourDiff || row.hour_diff || 0).toFixed(2)}</td>
                      <td className={clsx("text-right font-mono", parseFloat(row.adjustment || 0) < 0 ? "text-rose-600" : "text-emerald-600")}>{formatCurrency(row.adjustment)}</td>
                      <td className="text-right font-mono text-emerald-600">{formatCurrency(row.bonusTotal || row.bonus_total)}</td>
                      <td className="text-right font-mono text-rose-600">{formatCurrency(row.deductionTotal || row.deduction_total)}</td>
                      <td className="text-right font-mono text-rose-600">{formatCurrency(row.socialSecurityDeduct || row.social_security_deduct)}</td>
                      <td className="text-right font-mono font-bold text-brand-700">{formatCurrency(row.netSalary || row.net_salary)}</td>
                      <td>{getStatusBadge(row.status, t)}</td>
                    </tr>,
                    isExp && breakdown?.length > 0 && (
                      <tr key={`${row.id}-breakdown`}>
                        <td colSpan={11} className="bg-slate-50 p-0">
                          <div className="p-4">
                            <p className="font-semibold text-[13px] mb-2 text-slate-700 flex items-center gap-1"><Calendar size={13} /> {t("dailyBreakdown")}</p>
                            <div className="rounded-lg border border-slate-200 overflow-x-auto bg-white">
                              <table className="w-full text-xs">
                                <thead><tr className="bg-slate-100/60"><th className="px-3 py-2 text-left">{t("date")}</th><th className="px-3 py-2 text-right">{t("hoursWorked")}</th><th className="px-3 py-2 text-right">{t("hourDiff")}</th><th className="px-3 py-2 text-right">{t("adjustment")}</th><th className="px-3 py-2 text-left">{t("status")}</th></tr></thead>
                                <tbody>
                                  {breakdown.map((day: any, i: number) => (
                                    <tr key={i} className="border-t border-slate-100">
                                      <td className="px-3 py-1.5 font-mono">{day.date}</td>
                                      <td className="px-3 py-1.5 text-right font-mono">{parseFloat(day.hours_worked || 0).toFixed(2)}</td>
                                      <td className={clsx("px-3 py-1.5 text-right font-mono", day.diff < 0 ? "text-rose-600" : day.diff > 0 ? "text-emerald-600" : "text-slate-500")}>{day.diff >= 0 ? "+" : ""}{parseFloat(day.diff || 0).toFixed(2)}</td>
                                      <td className={clsx("px-3 py-1.5 text-right font-mono", day.adjustment < 0 ? "text-rose-600" : day.adjustment > 0 ? "text-emerald-600" : "text-slate-500")}>{day.adjustment >= 0 ? "+" : ""}{formatCurrency(day.adjustment)}</td>
                                      <td className="px-3 py-1.5"><span className={`badge ${day.status === "present" ? "badge-green" : "badge-gray"}`}>{day.status}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
