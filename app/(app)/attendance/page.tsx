"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Users as UsersIcon, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function dayName(dateStr: string, locale: "ar" | "en") {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { weekday: "long" });
}

export default function AttendancePage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const now = new Date();
  const months = ar ? MONTHS_AR : MONTHS_EN;

  const [employees, setEmployees] = useState<any[]>([]);
  const [empId, setEmpId]         = useState("");
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [year, setYear]           = useState(now.getFullYear());
  const [records, setRecords]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/employees");
        setEmployees(res.data || []);
        if (res.data?.[0]) setEmpId(res.data[0].employee_id);
      } catch (e: any) { setError(e.message); }
    })();
  }, []);

  useEffect(() => {
    if (!empId) return;
    setLoading(true); setError("");
    api.get("/attendance", { params: { employee_id: empId, month, year } })
      .then((res) => setRecords(res.data || []))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [empId, month, year]);

  const totalHours = useMemo(
    () => records.reduce((s, r) => s + (parseFloat(r.hours_worked) || 0), 0),
    [records]
  );
  const daysWorked = records.filter((r) => (parseFloat(r.hours_worked) || 0) > 0).length;

  return (
    <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <Clock className="text-brand-600" size={22} />
        <h2 className="text-xl font-bold text-slate-800">{ar ? "سجل الحضور" : "Attendance History"}</h2>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600 flex items-center gap-1"><UsersIcon size={14} />{ar ? "الموظف:" : "Employee:"}</span>
        <select className="form-select w-56 text-sm" value={empId} onChange={(e) => setEmpId(e.target.value)}>
          <option value="">—</option>
          {employees.map((emp) => (
            <option key={emp.employee_id} value={emp.employee_id}>{emp.name} ({emp.employee_id})</option>
          ))}
        </select>
        <span className="text-sm font-medium text-slate-600 ms-2">{ar ? "الفترة:" : "Period:"}</span>
        <select className="form-select w-32 text-sm" value={month} onChange={(e) => setMonth(+e.target.value)}>
          {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-select w-24 text-sm" value={year} onChange={(e) => setYear(+e.target.value)}>
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-5">
          <div className="text-2xl font-bold text-slate-900">{records.length}</div>
          <div className="text-xs text-slate-500 mt-1">{ar ? "إجمالي السجلات" : "Records"}</div>
        </div>
        <div className="card text-center py-5">
          <div className="text-2xl font-bold text-brand-700">{daysWorked}</div>
          <div className="text-xs text-slate-500 mt-1">{ar ? "أيام عمل" : "Days worked"}</div>
        </div>
        <div className="card text-center py-5">
          <div className="text-2xl font-bold text-emerald-700">{totalHours.toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">{ar ? "إجمالي الساعات" : "Total hours"}</div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="card-header"><div className="card-title"><Clock size={16} className="text-brand-600" />{months[month - 1]} {year}</div></div>
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <span className="spinner spinner-dark w-5 h-5" />
            {ar ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا توجد سجلات لهذه الفترة" : "No records for this period"}</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{ar ? "التاريخ" : "Date"}</th>
                  <th>{ar ? "اليوم" : "Day"}</th>
                  <th>{ar ? "دخول" : "Clock In"}</th>
                  <th>{ar ? "خروج" : "Clock Out"}</th>
                  <th className="text-right">{ar ? "ساعات العمل" : "Hours"}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.work_date}</td>
                    <td>{dayName(r.work_date, lang as "ar" | "en")}</td>
                    <td className="font-mono">{r.clock_in || "-"}</td>
                    <td className="font-mono">{r.clock_out || "-"}</td>
                    <td className={`text-right font-semibold ${r.hours_worked > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                      {Number(r.hours_worked).toFixed(2)}
                    </td>
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
