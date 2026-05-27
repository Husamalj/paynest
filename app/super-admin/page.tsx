"use client";

import { useEffect, useState } from "react";
import {
  Building2, Plus, X, CheckCircle2, AlertTriangle, Edit3,
  Trash2, LogOut, Power, Clock, Users, Ban, RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";

function safeErr(e: any) {
  if (!e) return "Error";
  if (typeof e === "string") return e;
  if (typeof e.message === "string") return e.message;
  return String(e);
}

const TABS = ["pending", "active", "suspended", "all"] as const;
type Tab = typeof TABS[number];

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState({ companyName: "", slug: "", ownerName: "", email: "", password: "123456", maxEmployees: "" });
  const [editMax, setEditMax] = useState<{ company: any; value: string } | null>(null);

  const signOut = () => {
    ["token", "paynest_logged_in", "role", "user", "paynest_employee_id"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/";
  };

  const load = async () => {
    try {
      setError("");
      const res = await api.get("/companies");
      setCompanies(res.data || []);
    } catch (e: any) { setError(safeErr(e)); }
  };

  useEffect(() => { load(); }, []);

  const autoSlug = (v: string) =>
    setForm((f) => ({
      ...f,
      companyName: v,
      slug: v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    }));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      const createRes = await api.post("/auth/register-company", form);
      if (createRes.data.pending) {
        const allRes = await api.get("/companies");
        const created = (allRes.data || []).find((c: any) => c.slug === form.slug);
        if (created) await api.patch(`/companies/${created.id}/approve`);
      }
      setSuccess("Company created and activated");
      setShowAdd(false);
      setForm({ companyName: "", slug: "", ownerName: "", email: "", password: "123456", maxEmployees: "" });
      await load();
    } catch (e: any) { setError(safeErr(e)); }
  };

  const action = async (id: number, endpoint: string, successMsg: string) => {
    setBusyId(id); setError(""); setSuccess("");
    try {
      if (endpoint === "toggle-status") {
        await api.patch(`/companies/${id}`, { toggleStatus: true });
      } else {
        await api.patch(`/companies/${id}/${endpoint}`);
      }
      setSuccess(successMsg);
      await load();
    } catch (e: any) { setError(safeErr(e)); }
    finally { setBusyId(null); }
  };

  const saveMaxEmployees = async () => {
    if (!editMax) return;
    setBusyId(editMax.company.id); setError(""); setSuccess("");
    try {
      await api.patch(`/companies/${editMax.company.id}`, { maxEmployees: editMax.value });
      const newVal = editMax.value === "" ? "unlimited" : editMax.value;
      setSuccess(`Max employees for "${editMax.company.name}" set to ${newVal}`);
      setEditMax(null);
      await load();
    } catch (e: any) { setError(safeErr(e)); }
    finally { setBusyId(null); }
  };

  const handleDelete = async (company: any) => {
    if (!window.confirm(`Delete "${company.name}"? This is permanent.`)) return;
    setBusyId(company.id); setError(""); setSuccess("");
    try {
      await api.delete(`/companies/${company.id}`);
      setSuccess("Company deleted");
      await load();
    } catch (e: any) { setError(safeErr(e)); }
    finally { setBusyId(null); }
  };

  const stats = {
    total: companies.length,
    pending: companies.filter((c) => c.status === "pending").length,
    active: companies.filter((c) => c.status === "active" || (!c.status && c.is_active !== false)).length,
    suspended: companies.filter((c) => c.is_active === false && c.status !== "pending" && c.status !== "rejected").length,
  };

  const filtered = companies.filter((c) => {
    if (tab === "pending") return c.status === "pending";
    if (tab === "active") return c.status === "active" || (!c.status && c.is_active !== false);
    if (tab === "suspended") return c.is_active === false && c.status !== "pending" && c.status !== "rejected";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900">
            Pay<span className="text-blue-600">Nest</span>
            <span className="ml-2 text-sm font-semibold text-slate-400 tracking-widest uppercase">CEO Dashboard</span>
          </h1>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Company</button>
            <button className="btn btn-secondary" onClick={signOut}><LogOut size={16} /> Sign out</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Companies", value: stats.total, Icon: Building2, color: "text-brand-600 bg-brand-50" },
            { label: "Pending Approval", value: stats.pending, Icon: Clock, color: "text-amber-600 bg-amber-50" },
            { label: "Active", value: stats.active, Icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
            { label: "Suspended", value: stats.suspended, Icon: Ban, color: "text-rose-600 bg-rose-50" },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", color)}><Icon size={20} /></div>
              <div><div className="text-2xl font-bold text-slate-900">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
        {success && <div className="alert alert-success"><CheckCircle2 size={16} />{success}</div>}

        <div className="card p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-0 border-b border-slate-100">
            <div className="flex w-full">
              {([
                { key: "all",       label: "All",       count: stats.total,     active: "bg-slate-700 text-white",   inactive: "text-slate-500 hover:text-slate-700 hover:bg-slate-100" },
                { key: "active",    label: "Active",    count: stats.active,    active: "bg-emerald-600 text-white", inactive: "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50" },
                { key: "pending",   label: "Pending",   count: stats.pending,   active: "bg-amber-500 text-white",   inactive: "text-slate-500 hover:text-amber-700 hover:bg-amber-50" },
                { key: "suspended", label: "Suspended", count: stats.suspended, active: "bg-rose-600 text-white",    inactive: "text-slate-500 hover:text-rose-700 hover:bg-rose-50" },
              ] as const).map(({ key, label, count, active, inactive }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-t-lg transition-all duration-150 border-b-2",
                    tab === key
                      ? clsx(active, "border-current shadow-sm")
                      : clsx(inactive, "border-transparent")
                  )}
                >
                  {label}
                  <span className={clsx(
                    "inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-bold transition-colors",
                    tab === key ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                  )}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              {tab === "pending" ? "No pending companies" : "No companies in this category"}
            </div>
          ) : (
            <div className="table-wrapper border-0 rounded-none">
              <table>
                <thead>
                  <tr>
                    <th>Company</th><th>Owner Email</th><th>Slug</th><th>Employees</th><th>Max</th><th>Status</th><th>Registered</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const isPending = c.status === "pending";
                    const isActive = c.status === "active" || (!c.status && c.is_active !== false);
                    const isSuspended = c.is_active === false && !isPending;
                    return (
                      <tr key={c.id}>
                        <td className="font-semibold text-slate-900">{c.name}</td>
                        <td className="text-slate-500 text-xs">{c.owner_email || "—"}</td>
                        <td className="font-mono text-xs text-slate-500">{c.slug}</td>
                        <td><span className="flex items-center gap-1 text-slate-600"><Users size={13} /> {c.employee_count ?? "—"}</span></td>
                        <td>
                          <span className={clsx(
                            "text-xs font-medium",
                            c.max_employees != null && c.employee_count >= c.max_employees ? "text-rose-600" :
                            c.max_employees != null && c.employee_count >= (c.max_employees * 0.8) ? "text-amber-600" :
                            "text-slate-500"
                          )}>
                            {c.max_employees == null ? "∞" : c.max_employees}
                          </span>
                        </td>
                        <td>
                          {isPending && <span className="badge badge-yellow">Pending</span>}
                          {isActive && <span className="badge badge-green">Active</span>}
                          {isSuspended && <span className="badge badge-red">Suspended</span>}
                        </td>
                        <td className="text-slate-500 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <button className="btn btn-sm btn-secondary" disabled={busyId === c.id} onClick={() => setEditMax({ company: c, value: c.max_employees == null ? "" : String(c.max_employees) })}>
                              <Edit3 size={13} /> Limit
                            </button>
                            {isPending && (
                              <>
                                <button className="btn btn-sm btn-success" disabled={busyId === c.id} onClick={() => action(c.id, "approve", `"${c.name}" approved`)}><CheckCircle2 size={13} /> Approve</button>
                                <button className="btn btn-sm btn-danger" disabled={busyId === c.id} onClick={() => action(c.id, "reject", `"${c.name}" rejected`)}><Ban size={13} /> Reject</button>
                              </>
                            )}
                            {isActive && (
                              <>
                                <button className="btn btn-sm btn-secondary" disabled={busyId === c.id} onClick={() => action(c.id, "toggle-status", `"${c.name}" suspended`)}><Power size={13} /> Suspend</button>
                                <button className="btn btn-sm btn-danger" disabled={busyId === c.id} onClick={() => handleDelete(c)}><Trash2 size={13} /> Delete</button>
                              </>
                            )}
                            {isSuspended && (
                              <>
                                <button className="btn btn-sm btn-success" disabled={busyId === c.id} onClick={() => action(c.id, "approve", `"${c.name}" reactivated`)}><RefreshCw size={13} /> Reactivate</button>
                                <button className="btn btn-sm btn-danger" disabled={busyId === c.id} onClick={() => handleDelete(c)}><Trash2 size={13} /> Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">Add Company</h3><button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button></div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><label className="form-label">Company Name *</label><input className="form-input" value={form.companyName} onChange={(e) => autoSlug(e.target.value)} placeholder="Alpha Tech" required /></div>
              <div><label className="form-label">Slug *</label><input className="form-input" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="alpha-tech" required /></div>
              <div><label className="form-label">Owner Name *</label><input className="form-input" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} placeholder="Owner Name" required /></div>
              <div><label className="form-label">Owner Email *</label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="owner@company.com" required /></div>
              <div><label className="form-label">Temporary Password</label><input className="form-input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
              <div>
                <label className="form-label">Max Employees</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={form.maxEmployees}
                  onChange={(e) => setForm((f) => ({ ...f, maxEmployees: e.target.value }))}
                  placeholder="Leave empty for unlimited"
                />
                <p className="text-xs text-slate-400 mt-1">Set the maximum number of employees this company can have. Leave empty for unlimited.</p>
              </div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create Company</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Max Employees Modal */}
      {editMax && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditMax(null); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Edit Employee Limit — {editMax.company.name}</h3>
              <button className="modal-close" onClick={() => setEditMax(null)}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-slate-500">Current employees: <strong className="text-slate-900">{editMax.company.employee_count ?? 0}</strong></div>
                <div className="text-slate-500">Current limit: <strong className="text-slate-900">{editMax.company.max_employees == null ? "Unlimited" : editMax.company.max_employees}</strong></div>
              </div>
              <div>
                <label className="form-label">New Max Employees</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={editMax.value}
                  onChange={(e) => setEditMax({ ...editMax, value: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1">Leave empty for unlimited employees.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setEditMax(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={saveMaxEmployees} disabled={busyId === editMax.company.id}>
                  {busyId === editMax.company.id ? <span className="spinner" /> : <CheckCircle2 size={15} />} Save Limit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
