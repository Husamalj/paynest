"use client";

import { useState, useRef, useEffect } from "react";
import { Upload as UploadIcon, Clock, Wallet, FileSpreadsheet, Trash2, Download, CheckCircle2, AlertTriangle, X, Eye, Users, Crown } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import axios from "axios";
import clsx from "clsx";

function FileDropZone({ label, icon: Icon, accent, onFiles, accept, uploading }: any) {
  const { t } = useLanguage();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={clsx("upload-zone", dragOver && "drag-over", uploading && "opacity-60 cursor-not-allowed")}
      onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={uploading ? undefined : handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <div className={clsx("mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3", accent)}>
        <Icon size={26} strokeWidth={2} />
      </div>
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      <p className="text-[13px] text-slate-500 mb-1">{t("dragDrop")}</p>
      <p className="text-[11px] text-slate-400">{t("supportedFormats")}</p>
      <input ref={inputRef} type="file" multiple={accept === "attendance"} accept=".xlsx,.xlsm,.xls,.csv" className="hidden"
        onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) onFiles(files); e.target.value = ""; }} />
    </div>
  );
}

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function UploadPage() {
  const { t, lang } = useLanguage();
  const now = new Date();
  const [attendanceFiles, setAttendanceFiles] = useState<File[]>([]);
  const [salaryFiles, setSalaryFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [quotaError, setQuotaError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [previewType, setPreviewType] = useState("");
  const [lastUpload, setLastUpload] = useState<any>(null);
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear]   = useState(now.getFullYear());
  const [calculating, setCalculating] = useState(false);
  const ar = lang === "ar";
  const months = ar ? MONTHS_AR : MONTHS_EN;
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  // Manual attendance + missing punches
  const [employees, setEmployees] = useState<any[]>([]);
  const [missing, setMissing] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState({ employee_id: "", work_date: "", clock_in: "", clock_out: "" });
  const [manualSaving, setManualSaving] = useState(false);

  const loadMissing = async (m: number, y: number) => {
    try { const r = await api.get(`/attendance/missing?month=${m}&year=${y}`); setMissing(r.data || []); } catch { setMissing([]); }
  };

  useEffect(() => { loadUploadedFiles(); api.get("/employees").then((r) => setEmployees(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { loadMissing(periodMonth, periodYear); }, [periodMonth, periodYear]);

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.employee_id || !manualForm.work_date || (!manualForm.clock_in && !manualForm.clock_out)) {
      setError(ar ? "اختر الموظف والتاريخ وأدخل وقت دخول أو خروج" : "Pick employee, date and at least one time");
      return;
    }
    setManualSaving(true); setError(""); setSuccess("");
    try {
      await api.post("/attendance/manual", manualForm);
      setSuccess(ar ? "تم تسجيل الحضور — لا تنسَ إعادة حساب الرواتب" : "Attendance saved — remember to recalculate payroll");
      setManualForm({ employee_id: "", work_date: "", clock_in: "", clock_out: "" });
      await loadMissing(periodMonth, periodYear);
    } catch (err: any) { setError(err.message); }
    finally { setManualSaving(false); }
  };

  const completeMissing = (row: any) => {
    setManualForm({ employee_id: row.employee_id, work_date: row.work_date, clock_in: row.clock_in || "", clock_out: row.clock_out || "" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadUploadedFiles = async () => {
    try {
      const res = await api.get("/upload");
      const files = res.data || [];
      setUploadedFiles(files);
      return files;
    } catch { return []; }
  };

  const maybeAutoCalculate = async (prevFiles: any[], nextFiles: any[]) => {
    const hadBoth = prevFiles.some((f) => f.fileType === "attendance") && prevFiles.some((f) => f.fileType === "salary");
    if (hadBoth) return;
    if (!nextFiles.some((f) => f.fileType === "attendance") || !nextFiles.some((f) => f.fileType === "salary")) return;
    try {
      await api.post("/payroll/calculate", { month: periodMonth, year: periodYear });
      setSuccess((p) => p ? `${p} - ${t("calculationDone")}` : t("calculationDone"));
    } catch (err: any) { setError(err.message); }
  };

  const runCalculate = async () => {
    setCalculating(true); setError(""); setSuccess("");
    try {
      await api.post("/payroll/calculate", { month: periodMonth, year: periodYear });
      setSuccess(`${t("calculationDone")} — ${months[periodMonth - 1]} ${periodYear}`);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      if (typeof msg === "string" && msg.startsWith("QUOTA_EXCEEDED")) {
        setQuotaError(msg.replace("QUOTA_EXCEEDED: ", ""));
      } else if (typeof msg === "string" && msg.startsWith("WRONG_BOX_SALARY")) {
        setError(ar ? "⚠️ يبدو أن هذا ملف رواتب. الرجاء رفعه في خانة \"Salary File\" وليس الحضور." : "⚠️ This looks like a Salary file. Please upload it in the \"Salary File\" box, not Attendance.");
      } else if (typeof msg === "string" && msg.startsWith("WRONG_BOX_ATTENDANCE")) {
        setError(ar ? "⚠️ يبدو أن هذا ملف حضور. الرجاء رفعه في خانة \"Attendance Files\" وليس الرواتب." : "⚠️ This looks like an Attendance file. Please upload it in the \"Attendance Files\" box, not Salary.");
      } else {
        setError(msg);
      }
    } finally { setCalculating(false); }
  };

  const handleUpload = async (files: File[], type: string) => {
    setUploading(type); setError(""); setSuccess(""); setPreview([]); setLastUpload(null);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`/api/upload?type=${type}&month=${periodMonth}&year=${periodYear}`, formData, {
        headers: { "Content-Type": "multipart/form-data", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        withCredentials: true, // send the httpOnly auth cookie
        timeout: 60000,
      });
      const filesResult = res.data.files || [];
      const totalEmployees = filesResult.reduce((s: number, f: any) => s + (f.employee_count || 0), 0);
      setLastUpload({ type, fileCount: filesResult.length, totalEmployees });
      setSuccess(type === "salary"
        ? `✓ ${totalEmployees} ${t("employeeCount")} (${filesResult.length} ${t("filesFound")})`
        : `✓ ${filesResult.length} ${t("filesFound")}, ${totalEmployees} ${t("employeeCount")}`);
      if (filesResult[0]?.preview?.length) { setPreview(filesResult[0].preview); setPreviewType(type); }
      setAttendanceFiles([]); setSalaryFiles([]);
      const nextFiles = await loadUploadedFiles();
      await maybeAutoCalculate(uploadedFiles, nextFiles);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      if (typeof msg === "string" && msg.startsWith("QUOTA_EXCEEDED")) {
        setQuotaError(msg.replace("QUOTA_EXCEEDED: ", ""));
      } else if (typeof msg === "string" && msg.startsWith("WRONG_BOX_SALARY")) {
        setError(ar ? "⚠️ يبدو أن هذا ملف رواتب. الرجاء رفعه في خانة \"Salary File\" وليس الحضور." : "⚠️ This looks like a Salary file. Please upload it in the \"Salary File\" box, not Attendance.");
      } else if (typeof msg === "string" && msg.startsWith("WRONG_BOX_ATTENDANCE")) {
        setError(ar ? "⚠️ يبدو أن هذا ملف حضور. الرجاء رفعه في خانة \"Attendance Files\" وليس الرواتب." : "⚠️ This looks like an Attendance file. Please upload it in the \"Attendance Files\" box, not Salary.");
      } else {
        setError(msg);
      }
    } finally { setUploading(""); }
  };

  const handleDelete = async (file: any) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await api.delete(`/upload?id=${file.id}`);
      setUploadedFiles((p) => p.filter((f) => f.id !== file.id));
      setSuccess(t("deleteSuccess"));
    } catch (err: any) { setError(err.message); }
  };

  const handleDownload = async (file: any) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/upload/${file.id}/download`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const msg = res.status === 410
          ? (lang === "ar" ? "هذا الملف رُفع قبل تفعيل الميزة، فما تم حفظ نسخته الأصلية." : "This file was uploaded before the feature; its original copy was not stored.")
          : (lang === "ar" ? "تعذّر تنزيل الملف" : "Could not download the file");
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName || file.filename || "file.xlsx";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("upload")}</h2><p className="page-subtitle">{t("uploadFirst")}</p></div>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button></div>}

      {/* ── Period selector + Calculate button ─────────────────────── */}
      <div className="card border-2 border-brand-200 bg-brand-50/30">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-brand-700 font-semibold">
            <Clock size={16} />
            {ar ? "فترة الاحتساب:" : "Calculation period:"}
          </div>
          <select className="form-select w-36 text-sm" value={periodMonth} onChange={(e) => setPeriodMonth(+e.target.value)}>
            {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select className="form-select w-28 text-sm" value={periodYear} onChange={(e) => setPeriodYear(+e.target.value)}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={runCalculate} disabled={calculating} className="btn btn-primary gap-2 ms-auto">
            {calculating ? <span className="spinner" /> : <Wallet size={15} />}
            {ar ? "احتساب الرواتب" : "Calculate Payroll"}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {ar
            ? "اختر الشهر والسنة أولاً. ملف الرواتب الذي ترفعه يصبح المرجع الكامل لموظفي هذا الشهر ورواتبهم — كل شهر مستقل عن الآخر."
            : "Pick the month and year first. The salary file you upload becomes the definitive roster & salaries for that month — each month is independent."}
        </p>
      </div>

      {lastUpload && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{t("filesFound")}</div><div className="text-2xl font-bold text-slate-900">{lastUpload.fileCount}</div></div>
          <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={11} />{t("employees")}</div><div className="text-2xl font-bold text-emerald-600">{lastUpload.totalEmployees}</div></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><div className="card-title"><Clock size={16} className="text-brand-600" />{t("upload_attendance")}</div></div>
          <FileDropZone label={t("uploadAttendance")} icon={Clock} accent="bg-brand-50 text-brand-600" accept="attendance" uploading={uploading === "attendance"} onFiles={setAttendanceFiles} />
          {attendanceFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {attendanceFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                  <span className="flex items-center gap-2 min-w-0"><FileSpreadsheet size={14} className="text-brand-600 flex-shrink-0" /><span className="truncate">{f.name}</span></span>
                  <span className="text-slate-500 text-xs flex-shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
              <button className="btn btn-primary w-full mt-2" disabled={uploading !== ""} onClick={() => handleUpload(attendanceFiles, "attendance")}>
                {uploading === "attendance" ? <><span className="spinner" /> {t("uploading")}</> : <><UploadIcon size={15} />{t("uploadBtn")} ({attendanceFiles.length})</>}
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title"><Wallet size={16} className="text-emerald-600" />{t("upload_salary")}</div></div>
          <FileDropZone label={t("uploadSalary")} icon={Wallet} accent="bg-emerald-50 text-emerald-600" accept="salary" uploading={uploading === "salary"} onFiles={setSalaryFiles} />
          {salaryFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {salaryFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                  <span className="flex items-center gap-2 min-w-0"><FileSpreadsheet size={14} className="text-emerald-600 flex-shrink-0" /><span className="truncate">{f.name}</span></span>
                  <span className="text-slate-500 text-xs flex-shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
              <button className="btn btn-success w-full mt-2" disabled={uploading !== ""} onClick={() => handleUpload(salaryFiles, "salary")}>
                {uploading === "salary" ? <><span className="spinner" /> {t("uploading")}</> : <><UploadIcon size={15} />{t("uploadBtn")} ({salaryFiles.length})</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Manual attendance + missing punches ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><div className="card-title"><span className="text-base">✍️</span>{ar ? "تسجيل حضور يدوي" : "Manual Attendance"}</div></div>
          <form onSubmit={submitManual} className="space-y-3">
            <div>
              <label className="form-label">{ar ? "الموظف" : "Employee"} *</label>
              <select className="form-select" value={manualForm.employee_id} onChange={(e) => setManualForm((f) => ({ ...f, employee_id: e.target.value }))}>
                <option value="">{ar ? "اختر الموظف" : "Select employee"}</option>
                {employees.map((emp) => <option key={emp.employee_id} value={emp.employee_id}>{emp.name} — {emp.employee_id}</option>)}
              </select>
            </div>
            <div><label className="form-label">{ar ? "التاريخ" : "Date"} *</label><input type="date" className="form-input" value={manualForm.work_date} onChange={(e) => setManualForm((f) => ({ ...f, work_date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="form-label">{ar ? "الدخول" : "Check In"}</label><input type="time" className="form-input" value={manualForm.clock_in} onChange={(e) => setManualForm((f) => ({ ...f, clock_in: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "الخروج" : "Check Out"}</label><input type="time" className="form-input" value={manualForm.clock_out} onChange={(e) => setManualForm((f) => ({ ...f, clock_out: e.target.value }))} /></div>
            </div>
            <p className="text-[11px] text-slate-400">{ar ? "تكتب الناقص فقط — الموجود يبقى كما هو. ثم أعد حساب الرواتب." : "Enter only the missing side — the existing one stays. Then recalculate payroll."}</p>
            <button className="btn btn-primary w-full" disabled={manualSaving}>{manualSaving ? <span className="spinner" /> : null}{ar ? "حفظ" : "Save"}</button>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title"><span className="text-base">⚠️</span>{ar ? "بصمات ناقصة" : "Missing Punches"} <span className="text-[11px] font-normal text-slate-400">— {months[periodMonth - 1]} {periodYear}</span>{missing.length > 0 && <span className="badge badge-yellow text-[10px]">{missing.length}</span>}</div></div>
          {missing.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">{ar ? "لا يوجد بصمات ناقصة لهذا الشهر 👍" : "No missing punches this month 👍"}</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {missing.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50/40">
                  <div className="min-w-0 text-sm">
                    <div className="font-medium text-slate-900 truncate">{r.employee_name} <span className="text-[11px] text-slate-400">{r.work_date}</span></div>
                    <div className="text-[11px] text-slate-500">{ar ? "دخول" : "In"}: {r.clock_in || "—"} • {ar ? "خروج" : "Out"}: {r.clock_out || "—"} <span className="text-rose-500 font-medium">({r.missing === "in" ? (ar ? "ناقص دخول" : "missing in") : (ar ? "ناقص خروج" : "missing out")})</span></div>
                  </div>
                  <button className="btn btn-sm btn-secondary shrink-0" onClick={() => completeMissing(r)}>{ar ? "إكمال" : "Complete"}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title"><Eye size={16} className="text-brand-600" />{t("previewData")} ({previewType})</div></div>
          <div className="table-wrapper">
            <table>
              <thead><tr>{previewType === "attendance" ? (<><th>{t("employeeId")}</th><th>{t("date")}</th><th>{t("clockIn")}</th><th>{t("clockOut")}</th><th className="text-right">{t("hoursWorked")}</th></>) : (<><th>{t("employeeId")}</th><th>{t("name")}</th><th className="text-right">{t("baseSalary")}</th></>)}</tr></thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx}>{previewType === "attendance" ? (<><td className="font-mono text-xs text-slate-500">{row.employee_id}</td><td>{row.work_date}</td><td className="font-mono text-xs">{row.clock_in || "-"}</td><td className="font-mono text-xs">{row.clock_out || "-"}</td><td className="text-right font-mono">{parseFloat(row.hours_worked || 0).toFixed(2)}</td></>) : (<><td className="font-mono text-xs text-slate-500">{row.employee_id}</td><td className="font-medium">{row.name}</td><td className="text-right font-mono">{parseFloat(row.base_salary || 0).toLocaleString()}</td></>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><div className="card-title"><FileSpreadsheet size={16} className="text-brand-600" />{t("uploadedFiles")}</div><span className="text-xs text-slate-500">{uploadedFiles.length} {t("file")}</span></div>
        {uploadedFiles.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>{t("name")}</th><th>{t("type")}</th><th className="text-right">{t("employees")}</th><th>{t("uploadedAt")}</th><th className="text-right">{t("actions")}</th></tr></thead>
              <tbody>
                {uploadedFiles.map((file) => (
                  <tr key={file.id}>
                    <td className="font-medium"><span className="flex items-center gap-2"><FileSpreadsheet size={14} className="text-slate-400" /><span className="truncate max-w-[260px]">{file.originalName || file.filename}</span></span></td>
                    <td><span className={clsx("badge", file.fileType === "attendance" ? "badge-blue" : "badge-green")}>{file.fileType === "attendance" ? <Clock size={11} /> : <Wallet size={11} />}{file.fileType}</span></td>
                    <td className="text-right font-mono">{file.employeeCount || 0}</td>
                    <td className="text-xs text-slate-500">{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "-"}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {file.hasFile && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleDownload(file)} title={lang === "ar" ? "تنزيل الملف الأصلي" : "Download original file"}><Download size={13} />{lang === "ar" ? "تنزيل" : "Download"}</button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(file)}><Trash2 size={13} />{t("delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Quota Exceeded Modal ──────────────────────── */}
      {quotaError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 px-6 py-8 text-white text-center">
              <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                <Crown size={32} />
              </div>
              <h2 className="text-xl font-bold mb-1">Employee Limit Reached</h2>
              <p className="text-amber-50 text-sm">Subscribe to a larger plan to continue</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                {quotaError}
              </div>
              <p className="text-sm text-slate-500">
                Contact the system administrator (Super Admin) to raise your company's employee cap.
              </p>
              <div className="flex justify-end">
                <button className="btn btn-secondary" onClick={() => setQuotaError("")}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
