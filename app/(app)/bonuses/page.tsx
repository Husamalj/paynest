"use client";

import { useState, useEffect } from "react";
import { Plus, Gift, TrendingDown, Trash2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import clsx from "clsx";

function formatCurrency(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BonusesPage() {
  const { t, lang } = useLanguage();
  const [list, setList] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ employee_id: "", employee_name: "", type: "bonus", reason: "", amount: "", period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() });

  useEffect(() => {
    Promise.all([api.get("/bonuses"), api.get("/employees"), api.get("/payroll/latest").catch(() => ({ data: {} }))])
      .then(([bRes, eRes, plRes]) => {
        setList(bRes.data || []); setEmployees(eRes.data || []);
        // Default the deduction/bonus period to the latest calculated payroll period
        const pm = plRes.data?.period_month, py = plRes.data?.period_year;
        if (pm && py) setForm((f) => ({ ...f, period_month: pm, period_year: py }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const emp = employees.find((em) => em.employee_id === e.target.value);
    setForm((f) => ({ ...f, employee_id: e.target.value, employee_name: emp?.name || "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.employee_id || !form.amount) { setError(t("fillRequired")); return; }
    try {
      const res = await api.post("/bonuses", { ...form, amount: parseFloat(form.amount) });
      setList((p) => [res.data, ...p]);
      setSuccess(`${form.type === "bonus" ? t("bonus") : t("deduction")} ${t("add")}`);
      setShowModal(false);
      setForm((f) => ({ ...f, employee_id: "", employee_name: "", reason: "", amount: "", type: "bonus" }));
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    try { await api.delete(`/bonuses/${id}`); setList((p) => p.filter((item) => item.id !== id)); }
    catch (err: any) { setError(err.message); }
  };

  const filtered = filter === "all" ? list : list.filter((item) => item.type === filter);
  const totalBonuses = list.filter((i) => i.type === "bonus").reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalDeductions = list.filter((i) => i.type === "deduction").reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("bonuses")}</h2></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> {t("addBonus")}</button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")}><X size={14} /></button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Gift size={11} className="text-emerald-600" />{t("totalBonuses")}</div><div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalBonuses)}</div></div>
        <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingDown size={11} className="text-rose-600" />{t("totalDeductions")}</div><div className="text-2xl font-bold text-rose-600">{formatCurrency(totalDeductions)}</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Gift size={16} className="text-brand-600" />{t("bonuses")}</div>
          <div className="tabs"><button className={clsx("tab", filter === "all" && "tab-active")} onClick={() => setFilter("all")}>{t("all")}</button><button className={clsx("tab", filter === "bonus" && "tab-active")} onClick={() => setFilter("bonus")}>{t("bonus")}</button><button className={clsx("tab", filter === "deduction" && "tab-active")} onClick={() => setFilter("deduction")}>{t("deduction")}</button></div>
        </div>
        {filtered.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>{t("employee")}</th><th>{t("type")}</th><th>{t("reason")}</th><th className="text-right">{t("amount")}</th><th>{t("period")}</th><th className="text-right">{t("actions")}</th></tr></thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.employee_name || item.employeeId}</td>
                    <td><span className={clsx("badge", item.type === "bonus" ? "badge-green" : "badge-red")}>{item.type === "bonus" ? <Gift size={11} /> : <TrendingDown size={11} />}{item.type === "bonus" ? t("bonus") : t("deduction")}</span></td>
                    <td className="text-sm text-slate-600">{item.reason || "-"}</td>
                    <td className="text-right font-mono font-semibold">{formatCurrency(item.amount)}</td>
                    <td className="text-sm text-slate-500">{(item.periodMonth || item.period_month)}/{(item.periodYear || item.period_year)}</td>
                    <td className="text-right"><button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><Trash2 size={13} />{t("delete")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{t("addBonus")}</h3><button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="form-label">{t("employee")} *</label><select className="form-input" value={form.employee_id} onChange={handleEmployeeChange}><option value="">{t("selectEmployee")}</option>{employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.name}</option>)}</select></div>
              <div><label className="form-label">{t("type")}</label><select className="form-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}><option value="bonus">{t("bonus")}</option><option value="deduction">{t("deduction")}</option></select></div>
              <div><label className="form-label">{t("reason")}</label><input className="form-input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></div>
              <div><label className="form-label">{t("amount")} *</label><input type="number" min="0" step="0.01" className="form-input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">{t("month")}</label><input type="number" min="1" max="12" className="form-input" value={form.period_month} onChange={(e) => setForm((f) => ({ ...f, period_month: parseInt(e.target.value) }))} /></div>
                <div><label className="form-label">{t("year")}</label><input type="number" className="form-input" value={form.period_year} onChange={(e) => setForm((f) => ({ ...f, period_year: parseInt(e.target.value) }))} /></div>
              </div>
              <p className="text-[11px] text-amber-600">{lang === "ar" ? "ملاحظة: يظهر هذا البند في راتب هذا الشهر فقط — وأعد احتساب الرواتب بعد الحفظ." : "Note: this item shows only in this month's payroll — recalculate payroll after saving."}</p>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t("cancel")}</button><button type="submit" className="btn btn-primary">{t("save")}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
