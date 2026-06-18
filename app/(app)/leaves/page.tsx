"use client";

import { useState, useEffect } from "react";
import { Plus, Palmtree, Trash2, CheckCircle2, XCircle, AlertTriangle, X, Calendar, Check, Paperclip } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import clsx from "clsx";

function StatusBadge({ status, t }: any) {
  const map: Record<string, { cls: string; label: string }> = { pending: { cls: "badge-yellow", label: t("pending") }, approved: { cls: "badge-green", label: t("approved") }, rejected: { cls: "badge-red", label: t("rejected") } };
  const info = map[status] || { cls: "badge-gray", label: status };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

export default function LeavesPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("requests");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddLeave, setShowAddLeave] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState("all");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [leaveForm, setLeaveForm] = useState({ employee_id: "", employee_name: "", leave_type: "annual", start_date: "", end_date: "", days_count: "", reason: "" });
  const [holidayForm, setHolidayForm] = useState({ name: "", start_date: "", end_date: "" });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [lRes, bRes, hRes, eRes] = await Promise.all([api.get("/leaves"), api.get("/leaves/balances"), api.get("/leaves/holidays"), api.get("/employees")]);
      setLeaves(lRes.data || []); setBalances(bRes.data || []); setHolidays(hRes.data || []); setEmployees(eRes.data || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleEmpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const emp = employees.find((em) => em.employee_id === e.target.value);
    setLeaveForm((f) => ({ ...f, employee_id: e.target.value, employee_name: emp?.name || "" }));
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date) { setError(t("fillRequired")); return; }
    try {
      const res = await api.post("/leaves", { ...leaveForm, days_count: parseInt(leaveForm.days_count) || 1 });
      setLeaves((p) => [res.data, ...p]); setSuccess(t("add")); setShowAddLeave(false);
      setLeaveForm({ employee_id: "", employee_name: "", leave_type: "annual", start_date: "", end_date: "", days_count: "", reason: "" });
    } catch (err: any) { setError(err.message); }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name || !holidayForm.start_date) { setError(t("fillRequired")); return; }
    try {
      const res = await api.post("/leaves/holidays", { name: holidayForm.name, start_date: holidayForm.start_date, end_date: holidayForm.end_date || holidayForm.start_date });
      const created = Array.isArray(res.data) ? res.data : [res.data];
      setHolidays((p) => [...created, ...p]); setSuccess(t("add")); setShowAddHoliday(false);
      setHolidayForm({ name: "", start_date: "", end_date: "" });
    } catch (err: any) { setError(err.message); }
  };

  const handleApprove = async (id: number) => {
    try { await api.put(`/leaves/${id}`, { status: "approved" }); await loadAll(); }
    catch (err: any) { setError(err.message); }
  };

  const handleReject = async (id: number) => {
    try { await api.put(`/leaves/${id}`, { status: "rejected" }); await loadAll(); }
    catch (err: any) { setError(err.message); }
  };


  const handleDeleteHoliday = async (id: number) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    try { await api.delete(`/leaves/holidays/${id}`); setHolidays((p) => p.filter((h) => h.id !== id)); }
    catch (err: any) { setError(err.message); }
  };

  const leaveDate = (l: any) => new Date(l.startDate || l.start_date);
  const yearOptions = Array.from({ length: 2034 - 2026 + 1 }, (_, i) => 2026 + i);
  const filteredLeaves = leaves.filter((l) => {
    if (leaveFilter !== "all" && l.status !== leaveFilter) return false;
    const d = leaveDate(l);
    if (filterMonth && d.getMonth() + 1 !== filterMonth) return false;
    if (filterYear && d.getFullYear() !== filterYear) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("leaves")}</h2></div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setShowAddLeave(true)}><Plus size={15} /> {t("addLeave")}</button>
          <button className="btn btn-secondary" onClick={() => setShowAddHoliday(true)}><Plus size={15} /> {t("addHoliday")}</button>
        </div>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")}><X size={14} /></button></div>}

      <div className="tabs"><button className={clsx("tab", activeTab === "requests" && "tab-active")} onClick={() => setActiveTab("requests")}>{t("requestsTitle")}</button><button className={clsx("tab", activeTab === "balances" && "tab-active")} onClick={() => setActiveTab("balances")}>{t("leaveBalance")}</button><button className={clsx("tab", activeTab === "holidays" && "tab-active")} onClick={() => setActiveTab("holidays")}>{t("officialHolidays")}</button></div>

      {activeTab === "requests" && (
        <div className="card">
          <div className="card-header flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="card-title"><Palmtree size={16} className="text-brand-600" />{t("requestsTitle")}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <select className="form-input h-9 py-0 w-36 text-sm" value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}>
                {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select className="form-input h-9 py-0 w-28 text-sm" value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden h-9 text-sm">
                {[["all", t("all")], ["pending", t("pending")], ["approved", t("approved")]].map(([key, label], i) => (
                  <button
                    key={key}
                    onClick={() => setLeaveFilter(key)}
                    className={clsx(
                      "px-3 font-medium transition-colors",
                      i > 0 && "border-s border-slate-200",
                      leaveFilter === key ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {filteredLeaves.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>{t("employee")}</th><th>{t("leaveType")}</th><th>{t("startDate")}</th><th>{t("endDate")}</th><th>{t("days")}</th><th>{t("status")}</th><th className="text-right">{t("actions")}</th></tr></thead>
                <tbody>
                  {filteredLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td className="font-medium">
                        <div>{leave.employeeName || leave.employee_name || leave.employeeId}</div>
                        <div className="text-[11px] font-mono text-slate-400">{leave.employeeId || leave.employee_id}</div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{leave.leaveType || leave.leave_type}</span>
                        {(leave.attachmentUrl || leave.attachment_url) && (
                          <a href={leave.attachmentUrl || leave.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-[11px] text-brand-600 hover:underline">
                            <Paperclip size={11} />View file
                          </a>
                        )}
                      </td>
                      <td className="text-sm">{new Date(leave.startDate || leave.start_date).toLocaleDateString()}</td>
                      <td className="text-sm">{new Date(leave.endDate || leave.end_date).toLocaleDateString()}</td>
                      <td className="font-mono">{leave.daysCount || leave.days_count}</td>
                      <td>
                        <StatusBadge status={leave.status} t={t} />
                        <div className="flex gap-1 mt-1 text-[10px] text-slate-500">
                          <span title="Supervisor">👤 {leave.supervisorStatus || leave.supervisor_status || "pending"}</span>
                          <span title="HR">🏢 {leave.hrStatus || leave.hr_status || "pending"}</span>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {leave.status === "pending"
                            ? (<><button className="btn btn-sm btn-success" onClick={() => handleApprove(leave.id)}><Check size={12} />{t("approve")}</button><button className="btn btn-sm btn-danger" onClick={() => handleReject(leave.id)}><XCircle size={12} />{t("reject")}</button></>)
                            : <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "balances" && (
        <div className="card">
          <div className="card-header"><div className="card-title">{t("leaveBalance")}</div></div>
          {balances.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>{t("employee")}</th><th className="text-right">{t("annualLeave")} ({t("total")})</th><th className="text-right">{t("used")}</th><th className="text-right">{t("remaining")}</th><th className="text-right">{t("sickLeave")} ({t("remaining")})</th></tr></thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.id}>
                      <td className="font-medium">{b.employeeId}</td>
                      <td className="text-right font-mono">{b.annualTotal ?? 14}</td>
                      <td className="text-right font-mono">{b.annualUsed ?? 0}</td>
                      <td className="text-right font-mono font-semibold text-emerald-600">{b.annualRemaining ?? 14}</td>
                      <td className="text-right font-mono">{b.sickRemaining ?? 14}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "holidays" && (
        <div className="card">
          <div className="card-header"><div className="card-title"><Calendar size={16} className="text-brand-600" />{t("officialHolidays")}</div></div>
          {holidays.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>{t("holidayName")}</th><th>{t("holidayDate")}</th><th className="text-right">{t("actions")}</th></tr></thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h.id}>
                      <td className="font-medium">{h.name}</td>
                      <td>{new Date(h.holidayDate || h.holiday_date).toLocaleDateString()}</td>
                      <td className="text-right"><button className="btn btn-sm btn-danger" onClick={() => handleDeleteHoliday(h.id)}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddLeave && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddLeave(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{t("addLeave")}</h3><button className="modal-close" onClick={() => setShowAddLeave(false)}><X size={18} /></button></div>
            <form onSubmit={handleAddLeave} className="space-y-4">
              <div><label className="form-label">{t("employee")} *</label><select className="form-input" value={leaveForm.employee_id} onChange={handleEmpChange}><option value="">{t("selectEmployee")}</option>{employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.name}</option>)}</select></div>
              <div><label className="form-label">{t("leaveType")}</label><select className="form-input" value={leaveForm.leave_type} onChange={(e) => setLeaveForm((f) => ({ ...f, leave_type: e.target.value }))}><option value="annual">{t("annualLeave")}</option><option value="sick">{t("sickLeave")}</option><option value="unpaid">{t("unpaidLeave")}</option></select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">{t("startDate")} *</label><input type="date" className="form-input" value={leaveForm.start_date} onChange={(e) => setLeaveForm((f) => ({ ...f, start_date: e.target.value }))} required /></div>
                <div><label className="form-label">{t("endDate")} *</label><input type="date" className="form-input" value={leaveForm.end_date} onChange={(e) => setLeaveForm((f) => ({ ...f, end_date: e.target.value }))} required /></div>
              </div>
              <div><label className="form-label">{t("days")}</label><input type="number" min="1" className="form-input" value={leaveForm.days_count} onChange={(e) => setLeaveForm((f) => ({ ...f, days_count: e.target.value }))} /></div>
              <div><label className="form-label">{t("reason")}</label><input className="form-input" value={leaveForm.reason} onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))} /></div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowAddLeave(false)}>{t("cancel")}</button><button type="submit" className="btn btn-primary">{t("save")}</button></div>
            </form>
          </div>
        </div>
      )}

      {showAddHoliday && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddHoliday(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{t("addHoliday")}</h3><button className="modal-close" onClick={() => setShowAddHoliday(false)}><X size={18} /></button></div>
            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div><label className="form-label">{t("holidayName")} *</label><input className="form-input" value={holidayForm.name} onChange={(e) => setHolidayForm((f) => ({ ...f, name: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">{t("startDate")} *</label><input type="date" className="form-input" value={holidayForm.start_date} onChange={(e) => setHolidayForm((f) => ({ ...f, start_date: e.target.value }))} required /></div>
                <div><label className="form-label">{t("endDate")}</label><input type="date" className="form-input" value={holidayForm.end_date} onChange={(e) => setHolidayForm((f) => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowAddHoliday(false)}>{t("cancel")}</button><button type="submit" className="btn btn-primary">{t("save")}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
