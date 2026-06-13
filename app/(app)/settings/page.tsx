"use client";

import { useState, useEffect } from "react";
import { Calculator, Shield, Save, CheckCircle2, AlertTriangle, X, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import clsx from "clsx";

const WORKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WORKDAY_LABELS: Record<string, { ar: string; en: string }> = {
  Sun: { ar: "الأحد",    en: "Sunday"    },
  Mon: { ar: "الإثنين",  en: "Monday"    },
  Tue: { ar: "الثلاثاء", en: "Tuesday"   },
  Wed: { ar: "الأربعاء", en: "Wednesday" },
  Thu: { ar: "الخميس",   en: "Thursday"  },
  Fri: { ar: "الجمعة",   en: "Friday"    },
  Sat: { ar: "السبت",    en: "Saturday"  },
};

// Generate HH:00 options 00:00 – 23:00
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return { value: `${h}:00`, label: `${h}:00` };
});

const defaultForm = {
  company_name: "PayNest",
  system_mode: "daily",
  calc_mode: "daily",
  language: "ar",
  req_hours: 9,
  month_days: 176,          // hourly mode: req hours/month | daily mode: workdays/month (26)
  late_tolerance: 0,
  workdays: "Sun,Mon,Tue,Wed,Thu",
  deduction_rate: 1.0,
  extra_rate: 1.0,
  work_start_time: "09:00", // daily mode only
  timezone: "Asia/Amman",
};

const TIMEZONES: { value: string; ar: string; en: string }[] = [
  { value: "Asia/Amman", ar: "الأردن (عمّان)", en: "Jordan (Amman)" },
  { value: "Asia/Riyadh", ar: "السعودية (الرياض)", en: "Saudi Arabia (Riyadh)" },
  { value: "Asia/Dubai", ar: "الإمارات (دبي)", en: "UAE (Dubai)" },
  { value: "Asia/Kuwait", ar: "الكويت", en: "Kuwait" },
  { value: "Asia/Qatar", ar: "قطر", en: "Qatar" },
  { value: "Asia/Bahrain", ar: "البحرين", en: "Bahrain" },
  { value: "Asia/Muscat", ar: "عُمان (مسقط)", en: "Oman (Muscat)" },
  { value: "Asia/Baghdad", ar: "العراق (بغداد)", en: "Iraq (Baghdad)" },
  { value: "Asia/Beirut", ar: "لبنان (بيروت)", en: "Lebanon (Beirut)" },
  { value: "Asia/Damascus", ar: "سوريا (دمشق)", en: "Syria (Damascus)" },
  { value: "Africa/Cairo", ar: "مصر (القاهرة)", en: "Egypt (Cairo)" },
  { value: "America/New_York", ar: "أمريكا - شرقي (نيويورك)", en: "USA - Eastern (New York)" },
  { value: "America/Chicago", ar: "أمريكا - وسط (شيكاغو)", en: "USA - Central (Chicago)" },
  { value: "America/Denver", ar: "أمريكا - جبلي (دنفر)", en: "USA - Mountain (Denver)" },
  { value: "America/Los_Angeles", ar: "أمريكا - غربي (لوس أنجلوس)", en: "USA - Pacific (Los Angeles)" },
  { value: "Europe/London", ar: "بريطانيا (لندن)", en: "UK (London)" },
];

export default function SettingsPage() {
  const { t, lang } = useLanguage();
  const ar = lang === "ar";
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const isOwner = role === "owner";
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
        if (s) {
          setForm({
            company_name:    s.company_name    || "PayNest",
            system_mode:     s.system_mode     || "daily",
            calc_mode:       s.calc_mode       || s.system_mode || "daily",
            language:        s.language        || "ar",
            req_hours:       s.req_hours       ?? 9,
            month_days:      s.month_days      ?? (s.system_mode === "hourly" ? 176 : 26),
            late_tolerance:  s.late_tolerance  ?? 0,
            workdays:        s.workdays        || "Sun,Mon,Tue,Wed,Thu",
            deduction_rate:  s.deduction_rate  ?? 1.0,
            extra_rate:      s.extra_rate      ?? 1.0,
            work_start_time: s.work_start_time || "09:00",
            timezone:        s.timezone        || "Asia/Amman",
          });
        }
        setEmployees(eRes.data || []);
      })
      .catch(() => {});
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
      setSuccess(ar ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
    } catch (err: any) {
      // Retry once on a transient network/cold-start failure (no server response)
      const transient = /network|wak|fetch|connect/i.test(err?.message || "");
      if (transient) {
        try {
          await new Promise((r) => setTimeout(r, 1200));
          await api.put("/settings", form);
          setSuccess(ar ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
          return;
        } catch (err2: any) { setError(err2.message); return; }
      }
      setError(err.message);
    }
    finally { setSaving(false); }
  };

  const handleSSToggle = async (emp: any, value: boolean) => {
    // Optimistic: flip immediately, save in the background, revert on failure
    setEmployees((p) => p.map((e) => e.employee_id === emp.employee_id ? { ...e, social_security: value } : e));
    const save = () => api.put(`/employees/${emp.employee_id}`, { social_security: value });
    try {
      try { await save(); }
      catch (e1: any) {
        if (/network|wak|fetch|connect/i.test(e1?.message || "")) { await new Promise((r) => setTimeout(r, 1200)); await save(); }
        else { throw e1; }
      }
    } catch (err: any) {
      // revert on real failure
      setEmployees((p) => p.map((e) => e.employee_id === emp.employee_id ? { ...e, social_security: !value } : e));
      setError(err.message);
    }
  };

  const isDaily  = form.calc_mode === "daily";
  const isHourly = form.calc_mode === "hourly";

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t("settings")}</h2>
          <p className="page-subtitle">{t("payrollSystemDesc")}</p>
        </div>
      </div>

      {error   && <div className="alert alert-error">  <AlertTriangle size={16}/><span className="flex-1">{error}</span>  <button onClick={() => setError("")}   className="opacity-60 hover:opacity-100"><X size={14}/></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16}/><span className="flex-1">{success}</span><button onClick={() => setSuccess("")} className="opacity-60 hover:opacity-100"><X size={14}/></button></div>}

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── Payroll Mode ─────────────────────────────────── */}
        <div className="card border-2 border-brand-200">
          <div className="card-header">
            <div className="card-title"><Calculator size={16} className="text-brand-600"/>
              {ar ? "نظام احتساب الراتب" : "Payroll System"}
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-3">
            {ar
              ? "اختر طريقة احتساب الراتب: شهري (حسب أيام الدوام) أو ساعي (حسب ساعات الدوام)"
              : "Choose how salaries are calculated — Monthly (by workdays) or Hourly (by clocked hours)"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                value: "daily",
                icon: "📅",
                label:    ar ? "شهري (Monthly)"   : "Monthly-based",
                sublabel: ar
                  ? "الراتب = الأساسي ÷ أيام الشهر × أيام الدوام"
                  : "Salary = Base ÷ month days × days worked",
              },
              {
                value: "hourly",
                icon: "⏱️",
                label:    ar ? "ساعي (Hourly)"  : "Hourly-based",
                sublabel: ar
                  ? "الراتب = الأساسي ÷ ساعات الشهر المطلوبة × الساعات الفعلية"
                  : "Salary = Base ÷ required monthly hours × hours worked",
              },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, calc_mode: opt.value }))}
                className={clsx(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  form.calc_mode === opt.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 hover:border-brand-300"
                )}
              >
                <div className="font-bold text-slate-900 mb-1">{opt.icon} {opt.label}</div>
                <div className="text-xs text-slate-500">{opt.sublabel}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 max-w-md">
            <label className="form-label">{ar ? "المنطقة الزمنية للشركة" : "Company timezone"}</label>
            <select className="form-input" value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
              {TIMEZONES.map((z) => <option key={z.value} value={z.value}>{ar ? z.ar : z.en}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">{ar ? "تُحدّد بداية ونهاية اليوم (المداومون/الإجازات اليوم)." : "Defines the day boundary (who's working/on leave today)."}</p>
          </div>
        </div>

        {/* ── Calculation Settings ─────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Calculator size={16} className="text-brand-600"/>{t("calculationSettings")}</div>
          </div>

          {isDaily && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Company Name */}
              <div>
                <label className="form-label">
                  {t("companyName")}{" "}
                  {!isOwner && <span className="text-xs text-slate-400 ms-1">({ar ? "للمالك فقط" : "owner only"})</span>}
                </label>
                <input
                  className="form-input"
                  value={form.company_name}
                  onChange={(e) => isOwner && setForm((f) => ({ ...f, company_name: e.target.value }))}
                  disabled={!isOwner}
                  readOnly={!isOwner}
                />
              </div>

              {/* Hours per workday */}
              <div>
                <label className="form-label">{ar ? "ساعات الدوام يوميًا" : "Hours per workday"}</label>
                <input
                  type="number" className="form-input"
                  value={form.req_hours}
                  onChange={(e) => setForm((f) => ({ ...f, req_hours: parseFloat(e.target.value) || 9 }))}
                  min={1} max={24} step={0.5}
                />
              </div>

              {/* Workdays / month */}
              <div>
                <label className="form-label">{ar ? "أيام العمل في الشهر" : "Workdays / month"}</label>
                <input
                  type="number" className="form-input"
                  value={form.month_days}
                  onChange={(e) => setForm((f) => ({ ...f, month_days: parseInt(e.target.value) || 26 }))}
                  min={1} max={31}
                />
              </div>

              {/* Late tolerance */}
              <div>
                <label className="form-label">{ar ? "حد التأخير المسموح (دقائق)" : "Late tolerance (mins)"}</label>
                <input
                  type="number" className="form-input"
                  value={form.late_tolerance}
                  onChange={(e) => setForm((f) => ({ ...f, late_tolerance: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>

              {/* Deduction rate */}
              <div>
                <label className="form-label">{ar ? "معدل خصم التأخير" : "Deduction rate"}</label>
                <input
                  type="number" step="0.01" min="0" className="form-input"
                  value={form.deduction_rate}
                  onChange={(e) => setForm((f) => ({ ...f, deduction_rate: parseFloat(e.target.value) || 0 }))}
                />
              </div>

            </div>
          )}

          {isHourly && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Company Name */}
              <div>
                <label className="form-label">
                  {t("companyName")}{" "}
                  {!isOwner && <span className="text-xs text-slate-400 ms-1">({ar ? "للمالك فقط" : "owner only"})</span>}
                </label>
                <input
                  className="form-input"
                  value={form.company_name}
                  onChange={(e) => isOwner && setForm((f) => ({ ...f, company_name: e.target.value }))}
                  disabled={!isOwner}
                  readOnly={!isOwner}
                />
              </div>

              {/* Required hours / month */}
              <div>
                <label className="form-label">
                  {ar ? "الساعات المطلوبة في الشهر" : "Required hours / month"}
                  <span className="ms-1 text-xs text-slate-400">{ar ? "(مثال: 176)" : "(e.g. 176)"}</span>
                </label>
                <input
                  type="number" className="form-input"
                  value={form.month_days}
                  onChange={(e) => setForm((f) => ({ ...f, month_days: parseInt(e.target.value) || 176 }))}
                  min={1} max={744} step={1}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {ar
                    ? `معدل الساعة = الراتب الأساسي ÷ ${form.month_days} ساعة`
                    : `Hourly rate = Base salary ÷ ${form.month_days} hrs`}
                </p>
              </div>

              {/* Deduction rate */}
              <div>
                <label className="form-label">{ar ? "معدل خصم الساعات الناقصة" : "Deduction rate (for missing hours)"}</label>
                <input
                  type="number" step="0.01" min="0" className="form-input"
                  value={form.deduction_rate}
                  onChange={(e) => setForm((f) => ({ ...f, deduction_rate: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {ar ? "خصم = ساعات ناقصة × معدل الساعة × هذا المعدل" : "Deduction = missing hrs × hourly rate × this rate"}
                </p>
              </div>

            </div>
          )}
        </div>

        {/* ── Work Days (daily mode only) ───────────────────── */}
        {isDaily && (
          <>
            <div className="card">
              <div className="card-header"><div className="card-title">{t("workdays")}</div></div>
              <div className="flex flex-wrap gap-2">
                {WORKDAYS.map((day) => (
                  <button
                    key={day} type="button"
                    className={clsx(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                      selectedWorkdays.includes(day)
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-brand-400"
                    )}
                    onClick={() => toggleWorkday(day)}
                  >
                    {WORKDAY_LABELS[day]?.[lang as "ar" | "en"] || day}
                  </button>
                ))}
              </div>
            </div>

            {/* Work Start Time */}
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Clock size={16} className="text-brand-600"/>
                  {ar ? "وقت بدء الدوام" : "Work Start Time"}
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {ar
                  ? `يجب على الموظف الحضور في هذا الوقت. مدة الدوام ${form.req_hours} ساعة يوميًا.`
                  : `Employees must clock in at this time. Shift duration is ${form.req_hours} hours per day.`}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-40">
                  <label className="form-label">{ar ? "وقت البداية" : "Start time"}</label>
                  <select
                    className="form-select"
                    value={form.work_start_time}
                    onChange={(e) => setForm((f) => ({ ...f, work_start_time: e.target.value }))}
                  >
                    {HOUR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-5 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
                  <Clock size={14} className="text-brand-500"/>
                  <span>
                    {ar
                      ? `${form.work_start_time} → ${addHours(form.work_start_time, form.req_hours)}`
                      : `${form.work_start_time} → ${addHours(form.work_start_time, form.req_hours)}`}
                    <span className="text-slate-400 ms-2 text-xs">
                      ({ar ? `${form.req_hours} ساعة` : `${form.req_hours}h shift`})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Overtime Pay ─────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span className="text-lg">⚡</span>
              {ar ? "معدل الساعات الإضافية (Overtime)" : "Overtime Pay Rate"}
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {ar
              ? "كل ساعة عمل إضافية تُحتسب بمعدل مضاعف من معدل الساعة الأساسية."
              : "Every extra hour worked is paid at a multiplier of the base hourly rate."}
          </p>

          {/* Quick-select preset buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[1.0, 1.25, 1.5, 2.0].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setForm((f) => ({ ...f, extra_rate: preset }))}
                className={clsx(
                  "px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all",
                  form.extra_rate === preset
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                )}
              >
                ×{preset.toFixed(2)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, extra_rate: 0 }))}
              className={clsx(
                "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                form.extra_rate === 0
                  ? "border-slate-400 bg-slate-100 text-slate-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              )}
            >
              {ar ? "بدون إضافي" : "No overtime"}
            </button>
          </div>

          {/* Custom input + live preview */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <label className="form-label">{ar ? "معدل مخصص (×)" : "Custom multiplier (×)"}</label>
              <div className="relative">
                <span className="absolute inset-y-0 start-3 flex items-center text-slate-400 font-bold pointer-events-none">×</span>
                <input
                  type="number" step="0.05" min="0" max="10"
                  className="form-input ps-7"
                  value={form.extra_rate}
                  onChange={(e) => setForm((f) => ({ ...f, extra_rate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner"/> : <Save size={15}/>}
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>

      {/* ── Social Security ───────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><Shield size={16} className="text-brand-600"/>{t("employeeSettings")} — {t("socialSecurity")}</div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("employeeId")}</th>
                <th className="text-right">{t("socialSecurity")}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.employee_id}>
                  <td className="font-medium">{emp.name}</td>
                  <td className="font-mono text-xs text-slate-500">{emp.employee_id}</td>
                  <td className="text-right">
                    <label className="toggle">
                      {savingEmp[emp.employee_id] && <span className="spinner spinner-sm mr-2"/>}
                      <input
                        type="checkbox"
                        checked={!!emp.social_security}
                        onChange={(e) => handleSSToggle(emp, e.target.checked)}
                        disabled={!!savingEmp[emp.employee_id]}
                      />
                      <span className="toggle-slider"/>
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

/** Add N hours to a "HH:00" string, returns "HH:00" (wraps at 24) */
function addHours(startTime: string, hours: number): string {
  const [h] = startTime.split(":").map(Number);
  const end = (h + Math.floor(hours)) % 24;
  return `${String(end).padStart(2, "0")}:00`;
}
