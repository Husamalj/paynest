"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

export default function RemotePage() {
  const { t } = useLanguage();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employee_id: "", start_date: "", end_date: "", label: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([api.get("/remote-assignments"), api.get("/employees")]);
      const seen = new Set<string>();
      const unique = (aRes.data || []).filter((a: any) => { const k = `${a.employeeId}|${a.startDate}|${a.endDate}`; if (seen.has(k)) return false; seen.add(k); return true; });
      setAssignments(unique); setEmployees(eRes.data || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (submittingRef.current) return;
    submittingRef.current = true; setSubmitting(true);
    try {
      if (!form.employee_id || !form.start_date || !form.end_date) { setError(t("fillRequired")); return; }
      await api.post(`/employees/${form.employee_id}/remote-assignments`, { start_date: form.start_date, end_date: form.end_date, label: form.label });
      setSuccess(t("remoteWorkStatus")); setShowAdd(false); setForm({ employee_id: "", start_date: "", end_date: "", label: "" });
      await load();
    } catch (err: any) { setError(err.message); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  const handleDelete = async (a: any) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    try { await api.delete(`/employees/${a.employeeId || a.emp_id}/remote-assignments/${a.id}`); await load(); }
    catch (err: any) { setError(err.message); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("remoteMenu")}</h2><p className="page-subtitle">{t("manageRemoteWork")}</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> {t("add")}</button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")}><X size={14} /></button></div>}

      {assignments.length === 0 ? <div className="card text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>{t("employee")}</th><th>{t("startDate")}</th><th>{t("endDate")}</th><th>Label</th><th className="text-right">{t("actions")}</th></tr></thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.name || a.employeeId}</td>
                    <td>{new Date(a.startDate || a.start_date).toLocaleDateString()}</td>
                    <td>{new Date(a.endDate || a.end_date).toLocaleDateString()}</td>
                    <td className="text-sm text-slate-600">{a.label || "-"}</td>
                    <td className="text-right"><button className="btn btn-sm btn-danger" onClick={() => handleDelete(a)}><Trash2 size={13} />{t("delete")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{t("remoteWorkStatus")}</h3><button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button></div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><label className="form-label">{t("employee")} *</label><select className="form-input" value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}><option value="">{t("selectEmployee")}</option>{employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.name}</option>)}</select></div>
              <div><label className="form-label">{t("startDate")} *</label><input type="date" className="form-input" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} required /></div>
              <div><label className="form-label">{t("endDate")} *</label><input type="date" className="form-input" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} required /></div>
              <div><label className="form-label">Label</label><input className="form-input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} /></div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t("cancel")}</button><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <span className="spinner" /> : null}{t("save")}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
