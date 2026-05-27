"use client";

import { useState, useRef, useEffect } from "react";
import { Upload as UploadIcon, Clock, Wallet, FileSpreadsheet, Trash2, CheckCircle2, AlertTriangle, X, Eye, Users, Crown } from "lucide-react";
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
      <input ref={inputRef} type="file" multiple={accept === "attendance"} accept=".xlsx,.xls,.csv" className="hidden"
        onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) onFiles(files); e.target.value = ""; }} />
    </div>
  );
}

export default function UploadPage() {
  const { t } = useLanguage();
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

  useEffect(() => { loadUploadedFiles(); }, []);

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
      await api.post("/payroll/calculate", {});
      setSuccess((p) => p ? `${p} - ${t("calculationDone")}` : t("calculationDone"));
    } catch (err: any) { setError(err.message); }
  };

  const handleUpload = async (files: File[], type: string) => {
    setUploading(type); setError(""); setSuccess(""); setPreview([]); setLastUpload(null);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`/api/upload?type=${type}`, formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
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

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("upload")}</h2><p className="page-subtitle">{t("uploadFirst")}</p></div>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button></div>}

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
                    <td className="text-right"><button className="btn btn-sm btn-danger" onClick={() => handleDelete(file)}><Trash2 size={13} />{t("delete")}</button></td>
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
