"use client";

import { useState, useEffect } from "react";
import { Calculator, Shield, Save, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import clsx from "clsx";

const WORKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WORKDAY_LABELS: Record<string, { ar: string; en: string }> = {
  Sun: { ar: "الأحد", en: "Sunday" },
  Mon: { ar: "الإثنين", en: "Monday" },
  Tue: { ar: "الثلاثاء", en: "Tuesday" },
  Wed: { ar: "الأربعاء", en: "Wednesday" },
  Thu: { ar: "الخميس", en: "Thursday" },
  Fri: { ar: "الجمعة", en: "Friday" },
  Sat: { ar: "السبت", en: "Saturday" },
};

const defaultForm = { company_name: "PayNest", system_mode: "daily", language: "ar", req_hours: 8, month_days: 26, late_tolerance: 0, workdays: "Sun,Mon,Tue,Wed,Thu", deduction_rate: 1.0, extra_rate: 1.0 };

export default function SettingsPage() {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [savingEmp, setSavingEmp] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([api.get("/settings"), api.get("/employees")])
      .then(([sRes, eRes]) => {
        const s = sRes.data;
        if (s) setForm({ company_name: s.company_name || "PayNest", system_mode: s.system_mode || "daily", language: s.language || "ar", req_hours: s.req_hours || 8, month_days: s.month_days || 26, late_tolerance: s.late_tolerance || 0, workdays: s.workdays || "Sun,Mon,Tue,Wed,Thu", deduction_rate: s.deduction_rate || 1.0, extra_rate: s.extra_rate || 1.0 });
        setEmployees(eRes.data || []);
      })
      .catch(() => { });
  }, []);

  const selectedWorkdays = form.workdays ? form.workdays.split(",") : [];
  const toggleWorkday = (day: string) => {
    const current = form.workdays ? form.workdays.split(",").filter(Boolean) : [];
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    setForm((f) => ({ ...f, workdays: WORKDAYS.filter((d) => updated.includes(d)).join(",") }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await api.put("/settings", form);
      setSuccess(lang === "ar" ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleSSToggle = async (emp: any, value: boolean) => {
    setSavingEmp((p) => ({ ...p, [emp.employee_id]: true }));
    try {
      await api.put(`/employees/${emp.employee_id}`, { social_security: value });
      setEmployees((p) => p.map((e) => e.employee_id === emp.employee_id ? { ...e, social_security: value } : e));
    } catch (err: any) { setError(err.message); }
    finally { setSavingEmp((p) => ({ ...p, [emp.employee_id]: false })); }
  };

  return (
    <div className="space-y-6">
      <div className="page-header"><div><h2 className="page-title">{t("settings")}</h2><p className="page-subtitle">{t("payrollSystemDesc")}</p></div></div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} /><span className="flex-1">{error}</span><button onClick={() => setError("")} className="opacity-60 hover:opacity-100"><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")} className="opacity-60 hover:opacity-100"><X size={14} /></button></div>}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="card">
          <div className="card-header"><div className="card-title"><Calculator size={16} className="text-brand-600" />{t("calculationSettings")}</div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="form-label">{t("companyName")}</label><input className="form-input" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} /></div>
            <div><label className="form-label">{t("reqHours")}</label><input type="number" className="form-input" value={form.req_hours} onChange={(e) => setForm((f) => ({ ...f, req_hours: parseFloat(e.target.value) || 8 }))} min={1} max={24} step={0.5} /></div>
            <div><label className="form-label">{t("monthDays")}</label><input type="number" className="form-input" value={form.month_days} onChange={(e) => setForm((f) => ({ ...f, month_days: parseInt(e.target.value) || 26 }))} min={1} max={31} /></div>
            <div><label className="form-label">{t("lateTolerance")}</label><input type="number" className="form-input" value={form.late_tolerance} onChange={(e) => setForm((f) => ({ ...f, late_tolerance: parseInt(e.target.value) || 0 }))} min={0} /></div>
            <div><label className="form-label">{t("deductionRate")}</label><input type="number" step="0.01" className="form-input" value={form.deduction_rate} onChange={(e) => setForm((f) => ({ ...f, deduction_rate: parseFloat(e.target.value) || 1 }))} /></div>
            <div><label className="form-label">{t("extraRate")}</label><input type="number" step="0.01" className="form-input" value={form.extra_rate} onChange={(e) => setForm((f) => ({ ...f, extra_rate: parseFloat(e.target.value) || 1 }))} /></div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">{t("workdays")}</div></div>
          <div className="flex flex-wrap gap-2">
            {WORKDAYS.map((day) => (
              <button key={day} type="button"
                className={clsx("px-4 py-2 rounded-lg text-sm font-medium border transition-all", selectedWorkdays.includes(day) ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-700 border-slate-200 hover:border-brand-400")}
                onClick={() => toggleWorkday(day)}
              >
                {WORKDAY_LABELS[day]?.[lang as "ar" | "en"] || day}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : <Save size={15} />}
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="card-header"><div className="card-title"><Shield size={16} className="text-brand-600" />{t("employeeSettings")} — {t("socialSecurity")}</div></div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>{t("name")}</th><th>{t("employeeId")}</th><th className="text-right">{t("socialSecurity")}</th></tr></thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.employee_id}>
                  <td className="font-medium">{emp.name}</td>
                  <td className="font-mono text-xs text-slate-500">{emp.employee_id}</td>
                  <td className="text-right">
                    <label className="toggle">{savingEmp[emp.employee_id] && <span className="spinner spinner-sm mr-2" />}
                      <input type="checkbox" checked={!!emp.social_security} onChange={(e) => handleSSToggle(emp, e.target.checked)} disabled={!!savingEmp[emp.employee_id]} />
                      <span className="toggle-slider" />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
