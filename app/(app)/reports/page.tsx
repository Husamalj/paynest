"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

function formatCurrency(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function downloadExcel(rows: any[], filename: string) {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Payroll");
  XLSX.writeFile(wb, filename);
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/payroll/history")
      .then((r: any) => { setHistory(r.data || []); })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (period: any) => {
    const m = period.period_month || period.periodMonth;
    const y = period.period_year || period.periodYear;
    setSelected({ month: m, year: y });
    try {
      const res = await api.get(`/payroll/period?month=${m}&year=${y}`);
      // Endpoint returns { period_month, period_year, system_mode, results } — pull the array
      const data = res.data;
      const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
      setPayroll(list);
    } catch (err: any) { setError(err.message); }
  };

  useEffect(() => {
    if (history.length > 0 && !selected) handleSelect(history[0]);
  }, [history]);

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  const totalNet = payroll.reduce((s, r) => s + (parseFloat(r.netSalary || r.net_salary) || 0), 0);
  const totalBase = payroll.reduce((s, r) => s + (parseFloat(r.baseSalary || r.base_salary) || 0), 0);
  const totalDed = payroll.reduce((s, r) => s + (parseFloat(r.deductionTotal || r.deduction_total) || 0) + (parseFloat(r.socialSecurityDeduct || r.social_security_deduct) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("reports")}</h2></div>
        {payroll.length > 0 && (
          <button className="btn btn-secondary" onClick={() => downloadExcel(payroll, `payroll-${selected?.month}-${selected?.year}.xlsx`)}><Download size={15} /> {t("exportCSV")}</button>
        )}
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}

      {history.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title"><BarChart3 size={16} className="text-brand-600" />{t("history")}</div></div>
          <div className="flex flex-wrap gap-2">
            {history.map((p, i) => {
              const m = p.period_month || p.periodMonth;
              const y = p.period_year || p.periodYear;
              const isSel = selected?.month === m && selected?.year === y;
              return <button key={i} onClick={() => handleSelect(p)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${isSel ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-700 border-slate-200 hover:border-brand-400"}`}>{m}/{y}</button>;
            })}
          </div>
        </div>
      )}

      {selected && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{t("totalBaseSalary")}</div><div className="text-xl font-bold">{formatCurrency(totalBase)}</div></div>
            <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{t("totalNetPay")}</div><div className="text-xl font-bold text-brand-700">{formatCurrency(totalNet)}</div></div>
            <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{t("totalDeductions")}</div><div className="text-xl font-bold text-rose-600">{formatCurrency(totalDed)}</div></div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">{t("monthlyReport")} — {selected.month}/{selected.year}</div></div>
            {payroll.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>{t("name")}</th><th>{t("employeeId")}</th><th className="text-right">{t("baseSalary")}</th><th className="text-right">{t("totalHours")}</th><th className="text-right">{t("adjustment")}</th><th className="text-right">{t("bonusTotal")}</th><th className="text-right">{t("deductionTotal")}</th><th className="text-right">{t("socialSecurityDeduct")}</th><th className="text-right">{t("netSalary")}</th></tr></thead>
                  <tbody>
                    {payroll.map((row, idx) => (
                      <tr key={idx}>
                        <td className="font-medium">{row.name || row.employeeName}</td>
                        <td className="font-mono text-xs text-slate-500">{row.employeeId}</td>
                        <td className="text-right font-mono">{formatCurrency(row.baseSalary || row.base_salary)}</td>
                        <td className="text-right font-mono">{parseFloat(row.totalHours || row.total_hours || 0).toFixed(2)}</td>
                        <td className="text-right font-mono">{formatCurrency(row.adjustment)}</td>
                        <td className="text-right font-mono text-emerald-600">{formatCurrency(row.bonusTotal || row.bonus_total)}</td>
                        <td className="text-right font-mono text-rose-600">{formatCurrency(row.deductionTotal || row.deduction_total)}</td>
                        <td className="text-right font-mono text-rose-600">{formatCurrency(row.socialSecurityDeduct || row.social_security_deduct)}</td>
                        <td className="text-right font-mono font-bold text-brand-700">{formatCurrency(row.netSalary || row.net_salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!selected && history.length === 0 && <div className="card text-center py-12 text-sm text-slate-400">{t("noData")}</div>}
    </div>
  );
}
