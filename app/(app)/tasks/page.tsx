"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Plus, AlertTriangle, CheckCircle2, X, Calendar, User } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import clsx from "clsx";

function getStatusColor(status: string) {
  return { pending: "badge-yellow", in_progress: "badge-blue", completed: "badge-green" }[status] || "badge-gray";
}

const PRIORITY = {
  urgent: { order: 0, badge: "badge-red", ar: "عاجل", en: "Urgent" },
  high: { order: 1, badge: "badge-yellow", ar: "عالية", en: "High" },
  medium: { order: 2, badge: "badge-blue", ar: "متوسطة", en: "Medium" },
  low: { order: 3, badge: "badge-gray", ar: "منخفضة", en: "Low" },
} as const;
const prKey = (p: string) => (p in PRIORITY ? (p as keyof typeof PRIORITY) : "medium");

export default function TasksPage() {
  const { t, lang } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmp, setFilterEmp] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [form, setForm] = useState({ task_name: "", employee_id: "", deadline: "", status: "pending", priority: "medium", target_value: "", unit: "", attachment: "", attachment_name: "" });

  const loadTasks = async () => { try { const res = await api.get("/tasks"); setTasks(res.data || []); } catch (err: any) { setError(err.message); } };
  const loadEmployees = async () => { try { const res = await api.get("/employees"); setEmployees(res.data || []); } catch { } };

  useEffect(() => { Promise.all([loadTasks(), loadEmployees()]).finally(() => setLoading(false)); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.task_name || !form.employee_id) { setError(t("fillRequired")); return; }
    try {
      const empName = employees.find((e) => e.employee_id === form.employee_id)?.name || "";
      const res = await api.post("/tasks", { ...form, employee_name: empName });
      setTasks((p) => [res.data, ...p]);
      setSuccess(t("taskAdded")); setShowAdd(false); setForm({ task_name: "", employee_id: "", deadline: "", status: "pending", priority: "medium", target_value: "", unit: "", attachment: "", attachment_name: "" });
    } catch (err: any) { setError(err.message); }
  };

  const filtered = tasks
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => !filterEmp || (t.employeeId || t.employee_id) === filterEmp)
    .filter((t) => !filterMonth || (t.deadline && new Date(t.deadline).getMonth() + 1 === Number(filterMonth)))
    .slice()
    .sort((a, b) => PRIORITY[prKey(a.priority)].order - PRIORITY[prKey(b.priority)].order);

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("tasks")}</h2></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> {t("addTask")}</button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")}><X size={14} /></button></div>}

      <div className="card">
        <div className="card-header flex-wrap gap-2">
          <div className="card-title"><CheckSquare size={16} className="text-brand-600" />{t("tasks")}</div>
          <div className="flex items-center gap-2">
            <select className="form-input text-sm py-1.5 w-40" value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}>
              <option value="">{lang === "ar" ? "كل الموظفين" : "All employees"}</option>
              {employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.name}</option>)}
            </select>
            <select className="form-input text-sm py-1.5 w-32" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="">{lang === "ar" ? "كل الشهور" : "All months"}</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{(lang === "ar" ? ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"] : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"])[i]}</option>)}
            </select>
          </div>
          <div className="tabs">
            {["all", "pending", "in_progress", "completed"].map((s) => (
              <button key={s} className={clsx("tab", filterStatus === s && "tab-active")} onClick={() => setFilterStatus(s)}>
                {s === "all" ? t("all") : s === "pending" ? t("pending") : s === "in_progress" ? t("inProgress") : t("completed")}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noTasks")}</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>{t("taskName")}</th><th>{t("assignTo")}</th><th>{lang === "ar" ? "الأولوية" : "Priority"}</th><th>{t("deadline")}</th><th>{t("target")}</th><th>{t("taskStatus")}</th></tr></thead>
              <tbody>
                {filtered.map((task) => (
                  <tr key={task.id}>
                    <td className="font-medium">{task.taskName || task.task_name}</td>
                    <td className="text-sm text-slate-600"><span className="flex items-center gap-1"><User size={13} />{task.employeeName || task.employee_name || task.employeeId}</span></td>
                    <td><span className={`badge ${PRIORITY[prKey(task.priority)].badge}`}>{lang === "ar" ? PRIORITY[prKey(task.priority)].ar : PRIORITY[prKey(task.priority)].en}</span></td>
                    <td className="text-sm text-slate-500">{task.deadline ? <span className="flex items-center gap-1"><Calendar size={13} />{new Date(task.deadline).toLocaleDateString()}</span> : "-"}</td>
                    <td className="text-sm text-slate-600 min-w-[140px]">{(() => {
                      const tgt = Number(task.targetValue ?? task.target_value);
                      if (!tgt || tgt <= 0) return <span className="text-slate-300">-</span>;
                      const cur = Number(task.currentValue ?? task.current_value ?? 0);
                      const pct = Math.min(100, Math.round((cur / tgt) * 100));
                      return (
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-500 mb-0.5"><span>{cur}/{tgt}{task.unit ? ` ${task.unit}` : ""}</span><span className={`font-bold ${pct >= 100 ? "text-emerald-600" : "text-brand-600"}`}>{pct}%</span></div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })()}</td>
                    <td><span className={`badge ${getStatusColor(task.status)}`}>{task.status === "pending" ? t("pending") : task.status === "in_progress" ? t("inProgress") : t("completed")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{t("addTask")}</h3><button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button></div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><label className="form-label">{t("taskName")} *</label><input className="form-input" value={form.task_name} onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))} required /></div>
              <div><label className="form-label">{t("assignTo")} *</label><select className="form-input" value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}><option value="">{t("selectEmployee")}</option>{employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.name}</option>)}</select></div>
              <div><label className="form-label">{lang === "ar" ? "الأولوية" : "Priority"}</label><select className="form-input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}><option value="urgent">{lang === "ar" ? "🔴 عاجل" : "🔴 Urgent"}</option><option value="high">{lang === "ar" ? "🟠 عالية" : "🟠 High"}</option><option value="medium">{lang === "ar" ? "🔵 متوسطة" : "🔵 Medium"}</option><option value="low">{lang === "ar" ? "⚪ منخفضة" : "⚪ Low"}</option></select></div>
              <div><label className="form-label">{t("deadline")}</label><input type="date" className="form-input" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">{t("targetValueOptional")}</label><input type="number" step="any" className="form-input" placeholder={t("egTen")} value={form.target_value} onChange={(e) => setForm((f) => ({ ...f, target_value: e.target.value }))} /></div>
                <div><label className="form-label">{t("unitOptional")}</label><input type="text" className="form-input" placeholder={t("egSales")} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} /></div>
              </div>
              <div>
                <label className="form-label">{lang === "ar" ? "مرفق ملف (اختياري)" : "Attach file (optional)"}</label>
                <input type="file" className="form-input" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
                  setForm((f) => ({ ...f, attachment: b64, attachment_name: file.name }));
                }} />
                {form.attachment_name && <p className="text-xs text-slate-500 mt-1">{form.attachment_name}</p>}
              </div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t("cancel")}</button><button type="submit" className="btn btn-primary">{t("save")}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
