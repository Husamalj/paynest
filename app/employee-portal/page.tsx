"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bell, Calendar, CheckCircle2, CheckSquare,
  Clock, LogOut, Palmtree, Send, User,
} from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import clsx from "clsx";

function formatCurrency(value: unknown) {
  return (parseFloat(String(value)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: unknown) {
  if (!value) return "-";
  return new Date(String(value)).toLocaleDateString();
}

function calcDays(start: string, end: string) {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24) + 1);
}

function StatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const labels: Record<string, string> = {
    pending: isRTL ? "قيد الانتظار" : "Pending",
    approved: isRTL ? "موافق عليه" : "Approved",
    rejected: isRTL ? "مرفوض" : "Rejected",
    in_progress: isRTL ? "قيد التنفيذ" : "In progress",
    completed: isRTL ? "مكتمل" : "Completed",
  };
  const cls: Record<string, string> = { pending: "badge-yellow", approved: "badge-green", rejected: "badge-red", in_progress: "badge-blue", completed: "badge-green" };
  return <span className={`badge ${cls[status] || "badge-gray"}`}>{labels[status] || status}</span>;
}

export default function EmployeePortalPage() {
  const { lang } = useLanguage();
  const isRTL = lang === "ar";
  const savedUser = JSON.parse(typeof window !== "undefined" ? localStorage.getItem("user") || "{}" : "{}");

  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState(savedUser.employee_number || (typeof window !== "undefined" ? localStorage.getItem("paynest_employee_id") : "") || "");
  const [employee, setEmployee] = useState<any>(null);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const isEmployeeLogin = role === "employee";

  const [leaveForm, setLeaveForm] = useState({ leave_type: "annual", start_date: "", end_date: "", reason: "" });

  const text = {
    title: isRTL ? "بوابة الموظف" : "Employee Portal",
    subtitle: isRTL ? "طلباتك ومهامك وملخص راتبك في مكان واحد" : "Your requests, tasks, and payroll summary",
    chooseEmployee: isRTL ? "اختر الموظف" : "Choose employee",
    base: isRTL ? "الراتب الأساسي" : "Base salary",
    net: isRTL ? "صافي الراتب" : "Net salary",
    deductions: isRTL ? "الخصومات" : "Deductions",
    hoursDiff: isRTL ? "فرق الساعات" : "Hour diff",
    requestLeave: isRTL ? "طلب إجازة" : "Request Leave",
    leaveType: isRTL ? "نوع الإجازة" : "Leave type",
    annual: isRTL ? "إجازة سنوية" : "Annual leave",
    sick: isRTL ? "إجازة مرضية" : "Sick leave",
    unpaid: isRTL ? "إجازة بدون راتب" : "Unpaid leave",
    startDate: isRTL ? "تاريخ البداية" : "Start date",
    endDate: isRTL ? "تاريخ النهاية" : "End date",
    reason: isRTL ? "السبب" : "Reason",
    send: isRTL ? "إرسال الطلب" : "Send request",
    myLeaves: isRTL ? "طلباتي" : "My Requests",
    myTasks: isRTL ? "مهامي" : "My Tasks",
    announcements: isRTL ? "الإعلانات" : "Announcements",
    noData: isRTL ? "لا توجد بيانات" : "No data",
    selectFirst: isRTL ? "اختر اسمك للدخول إلى بوابة الموظف" : "Choose your name to enter the portal",
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!employeeId) { setEmployee(null); return; }
    localStorage.setItem("paynest_employee_id", employeeId);
    setEmployee(employees.find((item) => item.employee_id === employeeId) || null);
  }, [employeeId, employees]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      if (isEmployeeLogin) {
        const [meRes, payrollRes, tasksRes, leavesRes, balancesRes, announcementsRes] = await Promise.all([
          api.get("/employees/me"), api.get("/payroll/latest"), api.get("/tasks"),
          api.get("/leaves"), api.get("/leaves/balances"), api.get("/announcements"),
        ]);
        const me = meRes.data;
        setEmployees([me]); setEmployee(me); setEmployeeId(me.employee_id);
        setTasks(tasksRes.data || []); setLeaves(leavesRes.data || []);
        setBalances(balancesRes.data || []); setAnnouncements(announcementsRes.data || []);
        setPayroll(payrollRes.data?.results || []);
      } else {
        const [employeesRes, payrollRes, tasksRes, leavesRes, balancesRes, announcementsRes] = await Promise.all([
          api.get("/employees"), api.get("/payroll/latest"), api.get("/tasks"),
          api.get("/leaves"), api.get("/leaves/balances"), api.get("/announcements"),
        ]);
        setEmployees(employeesRes.data || []);
        setTasks(tasksRes.data || []); setLeaves(leavesRes.data || []);
        setBalances(balancesRes.data || []); setAnnouncements(announcementsRes.data || []);
        setPayroll(payrollRes.data?.results || []);
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const myPayroll = useMemo(() => {
    if (!employeeId || !Array.isArray(payroll)) return null;
    return payroll.find((row) => row.employee_id === employeeId) || null;
  }, [employeeId, payroll]);

  const myTasks = useMemo(() => tasks.filter((task) => task.employee_id === employeeId), [tasks, employeeId]);
  const myLeaves = useMemo(() => leaves.filter((leave) => leave.employee_id === employeeId), [leaves, employeeId]);
  const myBalance = useMemo(() => balances.find((b) => b.employee_id === employeeId) || null, [balances, employeeId]);

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    const days = calcDays(leaveForm.start_date, leaveForm.end_date);
    if (!leaveForm.start_date || !leaveForm.end_date || !days) {
      setError(isRTL ? "اختار تاريخ البداية والنهاية" : "Choose start and end dates");
      return;
    }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await api.post("/leaves", {
        employee_id: employee.employee_id, employee_name: employee.name,
        leave_type: leaveForm.leave_type, start_date: leaveForm.start_date,
        end_date: leaveForm.end_date, days_count: days, reason: leaveForm.reason,
      });
      setLeaves((prev) => [res.data, ...prev]);
      setLeaveForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
      setSuccess(isRTL ? "تم إرسال طلب الإجازة" : "Leave request sent");
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? res.data : task)));
    } catch (err: any) { setError(err.message); }
  };

  const signOut = () => {
    ["token", "paynest_logged_in", "role", "user", "paynest_employee_id"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3 text-slate-500">
        <span className="spinner spinner-dark w-5 h-5" />
        {isRTL ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center"><User size={19} /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{employee?.name || savedUser.name || text.title}</h1>
              <p className="text-sm text-slate-500">{savedUser.email || text.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isEmployeeLogin && (
              <select className="form-select min-w-0 sm:w-72" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">{text.chooseEmployee}</option>
                {employees.map((item) => (
                  <option key={item.employee_id} value={item.employee_id}>{item.name} ({item.employee_id})</option>
                ))}
              </select>
            )}
            <button className="btn btn-danger" onClick={signOut}><LogOut size={15} />{isRTL ? "تسجيل خروج" : "Sign Out"}</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-6 space-y-5">
        {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
        {success && <div className="alert alert-success"><CheckCircle2 size={16} />{success}</div>}

        {!employee ? (
          <div className="card text-center py-16">
            <User size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">{text.selectFirst}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.base}</div><div className="text-xl font-bold text-slate-900">{formatCurrency(myPayroll?.base_salary || employee.base_salary)}</div></div>
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.net}</div><div className="text-xl font-bold text-emerald-700">{formatCurrency(myPayroll?.net_salary)}</div></div>
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.deductions}</div><div className="text-xl font-bold text-rose-700">{formatCurrency(Math.max(0, -(parseFloat(myPayroll?.adjustment) || 0)) + (parseFloat(myPayroll?.deduction_total) || 0) + (parseFloat(myPayroll?.social_security_deduct) || 0))}</div></div>
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.hoursDiff}</div><div className={clsx("text-xl font-bold", parseFloat(myPayroll?.hour_diff || 0) < 0 ? "text-rose-700" : "text-emerald-700")}>{(parseFloat(myPayroll?.hour_diff) || 0).toFixed(2)}</div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-5">
              <div className="card">
                <div className="card-header"><div className="card-title"><Palmtree size={16} className="text-brand-600" />{text.requestLeave}</div></div>
                <form className="space-y-4" onSubmit={submitLeave}>
                  <div>
                    <label className="form-label">{text.leaveType}</label>
                    <select className="form-select" value={leaveForm.leave_type} onChange={(e) => setLeaveForm((f) => ({ ...f, leave_type: e.target.value }))}>
                      <option value="annual">{text.annual}</option>
                      <option value="sick">{text.sick}</option>
                      <option value="unpaid">{text.unpaid}</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">{text.startDate}</label><input type="date" className="form-input" value={leaveForm.start_date} onChange={(e) => setLeaveForm((f) => ({ ...f, start_date: e.target.value }))} /></div>
                    <div><label className="form-label">{text.endDate}</label><input type="date" className="form-input" value={leaveForm.end_date} onChange={(e) => setLeaveForm((f) => ({ ...f, end_date: e.target.value }))} /></div>
                  </div>
                  <div><label className="form-label">{text.reason}</label><textarea className="form-textarea" value={leaveForm.reason} onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))} /></div>
                  {myBalance && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-xs text-slate-500">{text.annual}</div><div className="font-bold text-slate-900">{myBalance.annual_remaining}</div></div>
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-xs text-slate-500">{text.sick}</div><div className="font-bold text-slate-900">{myBalance.sick_remaining}</div></div>
                    </div>
                  )}
                  <button className="btn btn-primary w-full" disabled={saving}>
                    {saving ? <span className="spinner" /> : <Send size={15} />}{text.send}
                  </button>
                </form>
              </div>

              <div className="space-y-5">
                <div className="card">
                  <div className="card-header"><div className="card-title"><CheckSquare size={16} className="text-brand-600" />{text.myTasks}</div></div>
                  {myTasks.length === 0 ? <div className="text-center py-8 text-sm text-slate-400">{text.noData}</div> : (
                    <div className="space-y-3">
                      {myTasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">{task.task_name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock size={12} />{formatDate(task.deadline)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={task.status} isRTL={isRTL} />
                            {task.status !== "completed" && (
                              <button className="btn btn-sm btn-success" onClick={() => updateTaskStatus(task.id, "completed")}>{isRTL ? "تم" : "Done"}</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header"><div className="card-title"><Bell size={16} className="text-brand-600" />{text.announcements}</div></div>
                  {announcements.length === 0 ? <div className="text-center py-8 text-sm text-slate-400">{text.noData}</div> : (
                    <div className="space-y-3">
                      {announcements.slice(0, 4).map((item) => (
                        <div key={item.id} className="rounded-lg bg-brand-50 border border-brand-100 p-3">
                          <div className="font-semibold text-slate-900">{item.title}</div>
                          <div className="text-sm text-slate-600 mt-1">{item.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title"><Calendar size={16} className="text-brand-600" />{text.myLeaves}</div></div>
              {myLeaves.length === 0 ? <div className="text-center py-8 text-sm text-slate-400">{text.noData}</div> : (
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>{text.leaveType}</th><th>{text.startDate}</th><th>{text.endDate}</th><th>{isRTL ? "الأيام" : "Days"}</th><th>{isRTL ? "الحالة" : "Status"}</th></tr></thead>
                    <tbody>
                      {myLeaves.map((leave) => (
                        <tr key={leave.id}>
                          <td>{leave.leave_type}</td>
                          <td>{formatDate(leave.start_date)}</td>
                          <td>{formatDate(leave.end_date)}</td>
                          <td>{leave.days_count}</td>
                          <td><StatusBadge status={leave.status} isRTL={isRTL} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
