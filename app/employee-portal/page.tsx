"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bell, Calendar, CheckCircle2, CheckSquare,
  ClipboardList, Clock, LogOut, Palmtree, Send, User, UserCheck, Users, X,
} from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import clsx from "clsx";

const EVAL_CRITERIA = [
  { key: "score_accuracy",          en: "Accuracy at Work",                              ar: "الدقة في العمل" },
  { key: "score_innovation",        en: "Innovative Problem Solving",                    ar: "القدرة على التفكير بطرق مبتكرة لحل المشكلات" },
  { key: "score_speed",             en: "Task Completion Speed",                         ar: "السرعة في انجاز الاعمال الموكلة اليه" },
  { key: "score_development",       en: "Interest in Development & Improvement",         ar: "الاهتمام بتطوير وتحسين مستوى العمل" },
  { key: "score_quality_check",     en: "Output Quality Verification",                   ar: "اعادة التأكد من مخرجات العمل" },
  { key: "score_prioritization",    en: "Prioritization",                                ar: "ترتيب الاولويات" },
  { key: "score_independence",      en: "Ability to Work Independently",                 ar: "القدرة على العمل بدون اشراف" },
  { key: "score_deadlines",         en: "Meeting Deadlines",                             ar: "الالتزام بالمواعيد النهائية المحددة" },
  { key: "score_teamwork",          en: "Teamwork",                                      ar: "العمل ضمن الفريق" },
  { key: "score_communication",     en: "Effective Communication",                       ar: "القدرة على التواصل الفعال" },
  { key: "score_knowledge_sharing", en: "Knowledge & Experience Sharing",                ar: "تبادل المعلومات والخبرات لتسهيل العمل المشترك" },
  { key: "score_feedback",          en: "Performance Improvement from Feedback",         ar: "تحسين الأداء بناءً على التغذية الراجعة" },
  { key: "score_compliance",        en: "Compliance with Management Instructions",       ar: "الالتزام بالتعليمات المقدمة من قبل الإدارة" },
];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const defaultEvalScores = () => Object.fromEntries(EVAL_CRITERIA.map((c) => [c.key, 3]));

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
  const [employeeId, setEmployeeId] = useState(savedUser.employeeNumber || savedUser.employee_number || (typeof window !== "undefined" ? localStorage.getItem("paynest_employee_id") : "") || "");
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

  const evalNow = new Date();
  const [evalPeriodMonth, setEvalPeriodMonth] = useState(evalNow.getMonth() + 1);
  const [evalPeriodYear, setEvalPeriodYear] = useState(evalNow.getFullYear());
  const [evalSub, setEvalSub] = useState<any>(null);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalScores, setEvalScores] = useState<Record<string, number>>(defaultEvalScores());
  const [evalBonusWorthy, setEvalBonusWorthy] = useState(false);
  const [evalRecommendations, setEvalRecommendations] = useState("");
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalSaving, setEvalSaving] = useState(false);
  const [evalError, setEvalError] = useState("");
  const [evalSuccess, setEvalSuccess] = useState("");
  const [completedEvals, setCompletedEvals] = useState<Set<string>>(new Set());

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
    setEmployee(employees.find((item) => (item.employeeId || item.employee_id) === employeeId) || null);
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
        const meId = me.employeeId || me.employee_id;
        setEmployees([me]); setEmployee(me); setEmployeeId(meId);
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
    return payroll.find((row) => (row.employeeId || row.employee_id) === employeeId) || null;
  }, [employeeId, payroll]);

  const myTasks = useMemo(() => tasks.filter((task) => (task.employeeId || task.employee_id) === employeeId), [tasks, employeeId]);
  const myLeaves = useMemo(() => leaves.filter((leave) => (leave.employeeId || leave.employee_id) === employeeId), [leaves, employeeId]);
  const myBalance = useMemo(() => balances.find((b) => (b.employeeId || b.employee_id) === employeeId) || null, [balances, employeeId]);

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
        employee_id: employee.employeeId || employee.employee_id, employee_name: employee.name,
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

  const openEvalModal = async (sub: any) => {
    setEvalSub(sub);
    setEvalError("");
    setEvalScores(defaultEvalScores());
    setEvalBonusWorthy(false);
    setEvalRecommendations("");
    setShowEvalModal(true);
    setEvalLoading(true);
    try {
      const empId = sub.employeeId || sub.employee_id;
      const res = await api.get("/evaluations", { params: { employee_id: empId, month: evalPeriodMonth, year: evalPeriodYear } });
      if (res.data) {
        const ev = res.data;
        setEvalScores(Object.fromEntries(EVAL_CRITERIA.map((c) => [c.key, ev[c.key] ?? 3])));
        setEvalBonusWorthy(ev.bonus_worthy ?? false);
        setEvalRecommendations(ev.recommendations || "");
      }
    } catch { /* keep defaults */ }
    finally { setEvalLoading(false); }
  };

  const submitEval = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvalSaving(true);
    setEvalError("");
    try {
      const empId = evalSub.employeeId || evalSub.employee_id;
      await api.post("/evaluations", {
        employee_id: empId,
        period_month: evalPeriodMonth,
        period_year: evalPeriodYear,
        ...evalScores,
        bonus_worthy: evalBonusWorthy,
        recommendations: evalRecommendations,
      });
      setCompletedEvals((prev) => new Set([...prev, empId]));
      setEvalSuccess(isRTL ? "تم حفظ التقييم بنجاح" : "Evaluation saved successfully");
      setShowEvalModal(false);
      setTimeout(() => setEvalSuccess(""), 3000);
    } catch (err: any) {
      setEvalError(err.message);
    } finally {
      setEvalSaving(false);
    }
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
                  <option key={item.employeeId || item.employee_id} value={item.employeeId || item.employee_id}>{item.name} ({item.employeeId || item.employee_id})</option>
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
        {evalSuccess && <div className="alert alert-success"><CheckCircle2 size={16} />{evalSuccess}</div>}

        {!employee ? (
          <div className="card text-center py-16">
            <User size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">{text.selectFirst}</p>
          </div>
        ) : (
          <>
            {/* Supervisor / subordinates row — only when the data exists */}
            {(employee.supervisor || (employee.subordinates && employee.subordinates.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employee.supervisor && (
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <UserCheck size={16} className="text-brand-600" />
                        {isRTL ? "مشرفك" : "Your Supervisor"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                        {(employee.supervisor.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">{employee.supervisor.name}</div>
                        <div className="text-xs text-slate-500 truncate">{employee.supervisor.email || "-"}</div>
                        {employee.supervisor.phone && (
                          <div className="text-xs text-slate-500 truncate">{employee.supervisor.phone}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {employee.subordinates && employee.subordinates.length > 0 && (
                  <div className="card">
                    <div className="card-header flex-wrap gap-2">
                      <div className="card-title">
                        <Users size={16} className="text-brand-600" />
                        {isRTL ? "أنت تشرف على" : "You Supervise"}
                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          {employee.subordinates.length}
                        </span>
                      </div>
                      {/* Period selector for evaluations */}
                      <div className="flex items-center gap-1.5 ms-auto">
                        <ClipboardList size={13} className="text-slate-400 shrink-0" />
                        <select
                          className="form-select text-xs py-1 px-2 h-7 w-28"
                          value={evalPeriodMonth}
                          onChange={(e) => setEvalPeriodMonth(+e.target.value)}
                        >
                          {(isRTL ? MONTHS_AR : MONTHS_EN).map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                          ))}
                        </select>
                        <select
                          className="form-select text-xs py-1 px-2 h-7 w-20"
                          value={evalPeriodYear}
                          onChange={(e) => setEvalPeriodYear(+e.target.value)}
                        >
                          {[evalNow.getFullYear() - 1, evalNow.getFullYear(), evalNow.getFullYear() + 1].map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {employee.subordinates.map((sub: any) => {
                        const empId = sub.employeeId || sub.employee_id;
                        const isDone = completedEvals.has(empId);
                        return (
                          <div key={sub.id} className="flex items-center gap-2 text-sm py-1">
                            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {(sub.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-900 truncate">{sub.name}</div>
                              <div className="text-[11px] text-slate-500 truncate">{sub.email || empId}</div>
                            </div>
                            {isDone && (
                              <span className="badge badge-green text-[10px]">
                                {isRTL ? "تم التقييم" : "Evaluated"}
                              </span>
                            )}
                            <button
                              className="btn btn-sm btn-primary shrink-0"
                              onClick={() => openEvalModal(sub)}
                            >
                              <ClipboardList size={13} />
                              {isDone ? (isRTL ? "تعديل" : "Edit") : (isRTL ? "تقييم" : "Evaluate")}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.base}</div><div className="text-xl font-bold text-slate-900">{formatCurrency(myPayroll?.baseSalary || myPayroll?.base_salary || employee.baseSalary || employee.base_salary)}</div></div>
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.net}</div><div className="text-xl font-bold text-emerald-700">{formatCurrency(myPayroll?.netSalary || myPayroll?.net_salary)}</div></div>
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.deductions}</div><div className="text-xl font-bold text-rose-700">{formatCurrency(Math.max(0, -(parseFloat(myPayroll?.adjustment) || 0)) + (parseFloat(myPayroll?.deductionTotal || myPayroll?.deduction_total) || 0) + (parseFloat(myPayroll?.socialSecurityDeduct || myPayroll?.social_security_deduct) || 0))}</div></div>
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.hoursDiff}</div><div className={clsx("text-xl font-bold", parseFloat(myPayroll?.hourDiff || myPayroll?.hour_diff || 0) < 0 ? "text-rose-700" : "text-emerald-700")}>{(parseFloat(myPayroll?.hourDiff || myPayroll?.hour_diff) || 0).toFixed(2)}</div></div>
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

      {/* Evaluation Modal */}
      {showEvalModal && evalSub && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEvalModal(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            dir={isRTL ? "rtl" : "ltr"}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-start justify-between z-10">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList size={16} className="text-brand-600" />
                  {isRTL ? "تقييم الموظف" : "Employee Evaluation"}: {evalSub.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(isRTL ? MONTHS_AR : MONTHS_EN)[evalPeriodMonth - 1]} {evalPeriodYear}
                </p>
              </div>
              <button onClick={() => setShowEvalModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors mt-0.5">
                <X size={20} />
              </button>
            </div>

            {evalLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                <span className="spinner spinner-dark w-5 h-5" />
                {isRTL ? "جاري التحميل..." : "Loading..."}
              </div>
            ) : (
              <form onSubmit={submitEval} className="px-6 py-5 space-y-3">
                {/* Criteria */}
                {EVAL_CRITERIA.map((c, idx) => (
                  <div key={c.key} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-xs text-slate-400 mt-0.5 w-5 shrink-0">{idx + 1}.</span>
                      <span className="text-sm text-slate-700 leading-snug">{isRTL ? c.ar : c.en}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          type="button"
                          key={n}
                          onClick={() => setEvalScores((s) => ({ ...s, [c.key]: n }))}
                          className={`w-8 h-8 rounded-full text-sm font-bold border-2 transition-all ${
                            evalScores[c.key] === n
                              ? "bg-brand-600 text-white border-brand-600 scale-110"
                              : "bg-white text-slate-400 border-slate-200 hover:border-brand-400 hover:text-brand-600"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Bonus toggle */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-sm text-slate-700 flex-1">
                    {isRTL ? "هل يستحق الموظف مكافأة (100–125 دينار)؟" : "Does the employee deserve a bonus (100–125 JD)?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEvalBonusWorthy((b) => !b)}
                    className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${evalBonusWorthy ? "bg-brand-600" : "bg-slate-200"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        evalBonusWorthy ? (isRTL ? "left-0.5" : "right-0.5") : (isRTL ? "right-0.5" : "left-0.5")
                      }`}
                    />
                  </button>
                </div>

                {/* Recommendations */}
                <div>
                  <label className="form-label mb-1">{isRTL ? "التوصيات" : "Recommendations"}</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder={isRTL ? "أدخل توصياتك..." : "Enter recommendations..."}
                    value={evalRecommendations}
                    onChange={(e) => setEvalRecommendations(e.target.value)}
                  />
                </div>

                {/* Score summary */}
                <div className="bg-brand-50 rounded-xl p-3 flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-slate-500">{isRTL ? "المجموع الكلي" : "Total Score"}: </span>
                    <strong className="text-brand-700">
                      {Object.values(evalScores).reduce((a, b) => a + b, 0)} / 65
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">{isRTL ? "المعدل" : "Average"}: </span>
                    <strong className="text-brand-700">
                      {(Object.values(evalScores).reduce((a, b) => a + b, 0) / EVAL_CRITERIA.length).toFixed(1)}
                    </strong>
                  </div>
                </div>

                {evalError && (
                  <div className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{evalError}</div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEvalModal(false)}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={evalSaving}>
                    {evalSaving
                      ? <><span className="spinner" />{isRTL ? "جاري الحفظ..." : "Saving..."}</>
                      : <><ClipboardList size={15} />{isRTL ? "حفظ التقييم" : "Save Evaluation"}</>
                    }
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
