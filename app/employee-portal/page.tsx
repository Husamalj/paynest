"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const DownloadPayslipButton = dynamic(
  () => import("@/components/PayslipPDF").then((m) => m.DownloadPayslipButton),
  { ssr: false }
);
import {
  AlertTriangle, Bell, Calendar, CheckCircle2, CheckSquare, ChevronDown,
  ClipboardList, Clock, KeyRound, Languages, LogOut, Palmtree, Paperclip, Send,
  ThumbsDown, ThumbsUp, User, UserCheck, Users, X, Plus, Wifi,
} from "lucide-react";
import { useRef } from "react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import OrgChart, { type OrgEmp } from "@/components/OrgChart";
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
const EVAL_MAX_TOTAL = EVAL_CRITERIA.length * 5; // 65
const evalGradeFromScores = (scores: Record<string, number>) =>
  (Object.values(scores).reduce((a, b) => a + (b || 0), 0) / EVAL_MAX_TOTAL) * 100;
const evalBonusForGrade = (grade: number, tiers: { minGrade: number; maxGrade: number; amount: number }[]) => {
  const t = tiers.find((x) => grade >= x.minGrade && grade <= x.maxGrade);
  return t ? t.amount : 0;
};

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
    pending: isRTL ? "بانتظار المشرف" : "Awaiting supervisor",
    supervisor_approved: isRTL ? "موافق عليه" : "Approved",
    approved: isRTL ? "موافق عليه" : "Approved",
    rejected: isRTL ? "مرفوض" : "Rejected",
    in_progress: isRTL ? "قيد التنفيذ" : "In progress",
    completed: isRTL ? "مكتمل" : "Completed",
  };
  const cls: Record<string, string> = { pending: "badge-yellow", supervisor_approved: "badge-green", approved: "badge-green", rejected: "badge-red", in_progress: "badge-blue", completed: "badge-green" };
  return <span className={`badge ${cls[status] || "badge-gray"}`}>{labels[status] || status}</span>;
}

/** Inline measurable-target progress bar with editable current value. */
function TargetProgress({ task, isRTL, onSave }: { task: any; isRTL: boolean; onSave: (v: number) => void }) {
  const tgt = Number(task.targetValue ?? task.target_value);
  if (!tgt || tgt <= 0) return null;
  const cur = Number(task.currentValue ?? task.current_value ?? 0);
  const pct = Math.min(100, Math.round((cur / tgt) * 100));
  const [val, setVal] = useState(String(cur));
  useEffect(() => { setVal(String(cur)); }, [cur]);
  const unit = task.unit ? ` ${task.unit}` : "";
  return (
    <div className="mt-2 w-full">
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
        <span>{isRTL ? "الإنجاز" : "Progress"}: {cur}/{tgt}{unit}</span>
        <span className={`font-bold ${pct >= 100 ? "text-emerald-600" : "text-brand-600"}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <input
          type="number" step="any" value={val} onChange={(e) => setVal(e.target.value)}
          className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => onSave(Number(val) || 0)}>
          {isRTL ? "تحديث" : "Update"}
        </button>
      </div>
    </div>
  );
}

export default function EmployeePortalPage() {
  const { lang, toggleLanguage } = useLanguage();
  const isRTL = lang === "ar";
  const savedUser = JSON.parse(typeof window !== "undefined" ? localStorage.getItem("user") || "{}" : "{}");

  // Profile dropdown + change password modal
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(""); setPwdSuccess("");
    if (!pwdNew || pwdNew.length < 6) {
      setPwdError(isRTL ? "كلمة السر الجديدة لازم تكون 6 أحرف على الأقل" : "New password must be at least 6 characters");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError(isRTL ? "تأكيد كلمة السر غير مطابق" : "Confirmation does not match");
      return;
    }
    setPwdSaving(true);
    try {
      await api.put("/auth/change-password", { currentPassword: pwdCurrent, newPassword: pwdNew });
      setPwdSuccess(isRTL ? "تم تغيير كلمة السر" : "Password changed");
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
      setTimeout(() => { setShowPwdModal(false); setPwdSuccess(""); }, 1500);
    } catch (err: any) { setPwdError(err.message); }
    finally { setPwdSaving(false); }
  };

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

  const [leaveForm, setLeaveForm] = useState({ leave_type: "annual", start_date: "", end_date: "", reason: "", attachment: "" });
  const [subLeaves, setSubLeaves] = useState<any[]>([]);

  // ── Permission (short leave) ─────────────────────────────────────────────
  const [permForm, setPermForm] = useState({ date: "", hours: "1", reason: "", attachment: "" });
  // Salary advance
  const [advForm, setAdvForm] = useState({ amount: "", reason: "", installments: "1" });
  const [advances, setAdvances] = useState<any[]>([]);
  const [onLeave, setOnLeave] = useState<any[]>([]);
  // Quick-action modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [onlineForm, setOnlineForm] = useState({ start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10), reason: "" });
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkin, setCheckin] = useState<any>(null);
  const [showAdvModal, setShowAdvModal] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [showOrg, setShowOrg] = useState(false);
  const [orgEmployees, setOrgEmployees] = useState<OrgEmp[]>([]);
  const [advSaving, setAdvSaving] = useState(false);
  const [advError, setAdvError] = useState("");
  const [advSuccess, setAdvSuccess] = useState("");
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState("");
  const [permSuccess, setPermSuccess] = useState("");

  const evalNow = new Date();
  const [evalPeriodMonth, setEvalPeriodMonth] = useState(evalNow.getMonth() + 1);
  const [evalPeriodYear, setEvalPeriodYear] = useState(evalNow.getFullYear());
  const [evalSub, setEvalSub] = useState<any>(null);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalScores, setEvalScores] = useState<Record<string, number>>(defaultEvalScores());
  const [evalTiers, setEvalTiers] = useState<{ minGrade: number; maxGrade: number; amount: number }[]>([]);
  const [evalRecommendations, setEvalRecommendations] = useState("");
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalSaving, setEvalSaving] = useState(false);
  const [evalError, setEvalError] = useState("");
  const [evalSuccess, setEvalSuccess] = useState("");
  const [completedEvals, setCompletedEvals] = useState<Set<string>>(new Set());

  // ── Task assignment (supervisor → subordinate) ──────────────────────────
  const [taskSub, setTaskSub] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskTarget, setTaskTarget] = useState("");
  const [taskUnit, setTaskUnit] = useState("");
  const [taskAttachment, setTaskAttachment] = useState("");
  const [taskAttachmentName, setTaskAttachmentName] = useState("");
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [showDoneMine, setShowDoneMine] = useState(false);
  const [teamMonth, setTeamMonth] = useState(new Date().getMonth() + 1);
  const [teamYear, setTeamYear] = useState(new Date().getFullYear());
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [taskSuccess, setTaskSuccess] = useState("");

  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError(isRTL ? "الملف أكبر من 5MB" : "File exceeds 5MB"); return; }
    const b64 = await toBase64(file);
    setLeaveForm((f) => ({ ...f, attachment: b64 }));
  };

  const handleTaskAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setTaskError(isRTL ? "الملف أكبر من 5MB" : "File exceeds 5MB"); return; }
    setTaskAttachment(await toBase64(file));
    setTaskAttachmentName(file.name);
  };

  const openAttachment = (dataUrl: string, name?: string) => {
    try {
      const [meta, b64] = dataUrl.split(",");
      const mime = (meta.match(/data:(.*?);/) || [])[1] || "application/octet-stream";
      const bin = atob(b64); const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: mime }));
      const a = document.createElement("a"); a.href = url; a.target = "_blank";
      if (!mime.startsWith("image/") && mime !== "application/pdf") a.download = name || "attachment";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { window.open(dataUrl, "_blank"); }
  };

  const handlePermAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setPermError(isRTL ? "الملف أكبر من 5MB" : "File exceeds 5MB"); return; }
    const b64 = await toBase64(file);
    setPermForm((f) => ({ ...f, attachment: b64 }));
  };

  const approveSubLeave = async (leaveId: number, approve: boolean) => {
    try {
      const res = await api.put(`/leaves/${leaveId}`, { supervisor_status: approve ? "approved" : "rejected" });
      setSubLeaves((prev) => prev.map((l) => (l.id === leaveId ? res.data : l)));
    } catch (err: any) { setError(err.message); }
  };

  const loadCheckin = async () => {
    try { const r = await api.get("/attendance/checkin"); setCheckin(r.data); } catch { setCheckin(null); }
  };
  const doCheck = async (action: "in" | "out") => {
    setCheckinBusy(true);
    try { await api.post("/attendance/checkin", { action }); await loadCheckin(); }
    catch (err: any) { setError(err.message); }
    finally { setCheckinBusy(false); }
  };

  const submitOnline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !onlineForm.start) return;
    setCheckinBusy(true);
    try {
      const res = await api.post("/leaves", {
        employee_id: employee.employeeId || employee.employee_id,
        employee_name: employee.name,
        leave_type: "online",
        start_date: onlineForm.start,
        end_date: onlineForm.end || onlineForm.start,
        reason: onlineForm.reason,
      });
      setLeaves((prev) => [res.data, ...prev]);
      setShowOnlineModal(false);
      setSuccess(isRTL ? "تم إرسال طلب العمل أونلاين" : "Online work request sent");
    } catch (err: any) { setError(err.message); }
    finally { setCheckinBusy(false); }
  };

  const openTaskModal = (sub: any) => {
    setTaskSub(sub);
    setTaskName("");
    setTaskDeadline("");
    setTaskTarget("");
    setTaskUnit("");
    setTaskAttachment("");
    setTaskAttachmentName("");
    setTaskError("");
    setTaskSuccess("");
    setShowTaskModal(true);
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    setTaskSaving(true);
    setTaskError("");
    setTaskSuccess("");
    try {
      const empId = taskSub.employeeId || taskSub.employee_id;
      const res = await api.post("/tasks", {
        task_name: taskName.trim(),
        employee_id: empId,
        deadline: taskDeadline || null,
        status: "pending",
        target_value: taskTarget || null,
        unit: taskUnit || null,
        attachment: taskAttachment || null,
        attachment_name: taskAttachmentName || null,
      });
      setTasks((prev) => [res.data, ...prev]);
      setTaskSuccess(isRTL ? "تمت إضافة المهمة بنجاح" : "Task assigned successfully");
      setTimeout(() => setShowTaskModal(false), 1200);
    } catch (err: any) {
      setTaskError(err.message);
    } finally {
      setTaskSaving(false);
    }
  };

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

  // Mark which employees the current user has already evaluated for the selected period
  useEffect(() => {
    api.get("/evaluations", { params: { month: evalPeriodMonth, year: evalPeriodYear } })
      .then((r) => {
        const done = new Set<string>((r.data || []).map((ev: any) => String(ev.employee_id)));
        setCompletedEvals(done);
      })
      .catch(() => {});
  }, [evalPeriodMonth, evalPeriodYear]);

  useEffect(() => {
    if (!employeeId) { setEmployee(null); return; }
    localStorage.setItem("paynest_employee_id", employeeId);
    setEmployee(employees.find((item) => (item.employeeId || item.employee_id) === employeeId) || null);
  }, [employeeId, employees]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const safe = async (p: Promise<any>, fallback: any = null) => { try { return await p; } catch { return { data: fallback }; } };

      if (isEmployeeLogin) {
        const [meRes, payrollRes, tasksRes, leavesRes, balancesRes, announcementsRes] = await Promise.all([
          api.get("/employees/me"),
          safe(api.get("/payroll/latest"), { results: [] }),
          safe(api.get("/tasks"), []),
          safe(api.get("/leaves"), []),
          safe(api.get("/leaves/balances"), []),
          safe(api.get("/announcements"), []),
        ]);
        const me = meRes.data;
        const meId = me.employeeId || me.employee_id;
        setEmployees([me]); setEmployee(me); setEmployeeId(meId);
        setTasks(tasksRes.data || []); setLeaves(leavesRes.data || []);
        setBalances(balancesRes.data || []); setAnnouncements(announcementsRes.data || []);
        setPayroll(payrollRes.data?.results || []);
        // Load subordinate leave requests if this employee is a supervisor
        if (me.subordinates && me.subordinates.length > 0) {
          try { const slRes = await api.patch("/leaves", {}); setSubLeaves(slRes.data || []); } catch { /* no subs */ }
        }
        try { const advRes = await api.get("/advances"); setAdvances(advRes.data || []); } catch { /* ignore */ }
        try { const olRes = await api.get("/leaves/on-leave"); setOnLeave(olRes.data || []); } catch { /* ignore */ }
        try { const orgRes = await api.get("/company-structure"); setOrgEmployees(orgRes.data || []); } catch { /* ignore */ }
      } else {
        const [employeesRes, payrollRes, tasksRes, leavesRes, balancesRes, announcementsRes] = await Promise.all([
          api.get("/employees"),
          safe(api.get("/payroll/latest"), { results: [] }),
          safe(api.get("/tasks"), []),
          safe(api.get("/leaves"), []),
          safe(api.get("/leaves/balances"), []),
          safe(api.get("/announcements"), []),
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
  // All subordinate tasks grouped by employee (for tidy supervisor tracking)
  const teamBySub = useMemo(() => {
    const subs = (employee?.subordinates || []) as any[];
    return subs
      .map((sub) => {
        const eid = sub.employeeId || sub.employee_id;
        const subTasks = tasks.filter((t) => {
          if ((t.employeeId || t.employee_id) !== eid) return false;
          if (!t.deadline) return true; // tasks without a date always show
          const d = new Date(t.deadline);
          return d.getMonth() + 1 === teamMonth && d.getFullYear() === teamYear;
        });
        if (subTasks.length === 0) return null;
        const measurable = subTasks.filter((t) => Number(t.targetValue ?? t.target_value) > 0);
        const avgPct = measurable.length
          ? Math.round(
              measurable.reduce((a, t) => {
                const tgt = Number(t.targetValue ?? t.target_value);
                return a + Math.min(100, (Number(t.currentValue ?? t.current_value ?? 0) / tgt) * 100);
              }, 0) / measurable.length
            )
          : null;
        const doneCount = subTasks.filter((t) => t.status === "completed").length;
        const deadlines = subTasks.map((t) => t.deadline).filter(Boolean).sort();
        const nextDeadline = deadlines[0] || null;
        return { sub, eid, tasks: subTasks, avgPct, doneCount, total: subTasks.length, nextDeadline };
      })
      .filter(Boolean) as any[];
  }, [tasks, employee, teamMonth, teamYear]);
  const myLeaves = useMemo(() => leaves.filter((leave) => (leave.employeeId || leave.employee_id) === employeeId), [leaves, employeeId]);
  const myBalance = useMemo(() => balances.find((b) => (b.employeeId || b.employee_id) === employeeId) || null, [balances, employeeId]);

  const submitPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !permForm.date) {
      setPermError(isRTL ? "اختار التاريخ" : "Choose a date");
      return;
    }
    setPermSaving(true); setPermError(""); setPermSuccess("");
    try {
      const res = await api.post("/leaves", {
        employee_id: employee.employeeId || employee.employee_id,
        employee_name: employee.name,
        leave_type: "permission",
        start_date: permForm.date,
        end_date: permForm.date,
        days_count: parseInt(permForm.hours),
        reason: permForm.reason,
        attachment_url: permForm.attachment || null,
      });
      setLeaves((prev) => [res.data, ...prev]);
      setPermForm({ date: "", hours: "1", reason: "", attachment: "" });
      setShowPermModal(false);
      setPermSuccess(isRTL ? "تم إرسال طلب المغادرة" : "Permission request sent");
    } catch (err: any) { setPermError(err.message); }
    finally { setPermSaving(false); }
  };

  const submitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(advForm.amount);
    if (!amt || amt <= 0) { setAdvError(isRTL ? "أدخل مبلغاً صحيحاً" : "Enter a valid amount"); return; }
    setAdvSaving(true); setAdvError(""); setAdvSuccess("");
    try {
      const res = await api.post("/advances", { amount: amt, reason: advForm.reason, installments: parseInt(advForm.installments) || 1 });
      setAdvances((p) => [res.data, ...p]);
      setAdvForm({ amount: "", reason: "", installments: "1" });
      setShowAdvModal(false);
      setAdvSuccess(isRTL ? "تم إرسال طلب السلفة" : "Advance request sent");
    } catch (err: any) { setAdvError(err.message); }
    finally { setAdvSaving(false); }
  };

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
        attachment_url: leaveForm.attachment || null,
      });
      setLeaves((prev) => [res.data, ...prev]);
      setLeaveForm({ leave_type: "annual", start_date: "", end_date: "", reason: "", attachment: "" });
      setShowLeaveModal(false);
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

  const updateTaskProgress = async (taskId: number, current_value: number) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { current_value });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? res.data : task)));
    } catch (err: any) { setError(err.message); }
  };

  const openEvalModal = async (sub: any) => {
    setEvalSub(sub);
    setEvalError("");
    setEvalScores(defaultEvalScores());
    setEvalRecommendations("");
    setShowEvalModal(true);
    setEvalLoading(true);
    api.get("/bonus-tiers")
      .then((r) => setEvalTiers((r.data || []).map((t: any) => ({ minGrade: t.minGrade, maxGrade: t.maxGrade, amount: t.amount }))))
      .catch(() => {});
    try {
      const empId = sub.employeeId || sub.employee_id;
      const res = await api.get("/evaluations", { params: { employee_id: empId, month: evalPeriodMonth, year: evalPeriodYear } });
      if (res.data) {
        const ev = res.data;
        setEvalScores(Object.fromEntries(EVAL_CRITERIA.map((c) => [c.key, ev[c.key] ?? 3])));
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
        bonus_amount: evalBonusForGrade(evalGradeFromScores(evalScores), evalTiers),
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

            {/* Profile dropdown (same shape as HR Layout) */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {employee?.photoUrl || employee?.photo_url ? (
                  <img src={employee.photoUrl || employee.photo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-brand-100" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {(savedUser.name || employee?.name || "U")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate max-w-[140px]">{savedUser.name || employee?.name || "Employee"}</div>
                  <div className="text-[11px] text-slate-400 uppercase font-medium">{role}</div>
                </div>
                <ChevronDown size={14} className={clsx("text-slate-400 transition-transform flex-shrink-0", profileOpen && "rotate-180")} />
              </button>

              {profileOpen && (
                <div className={clsx("absolute top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50", isRTL ? "left-0" : "right-0")}>
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <div className="font-semibold text-slate-900 truncate">{savedUser.name || employee?.name || "Employee"}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{savedUser.email || employee?.email || "-"}</div>
                    <div className="mt-1.5 inline-flex px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold uppercase">{role}</div>
                  </div>
                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={() => { toggleLanguage(); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Languages size={16} className="text-slate-400" />
                      <span>{lang === "en" ? "العربية" : "English"}</span>
                      <span className="ms-auto text-[11px] font-bold text-slate-400 uppercase">{lang === "en" ? "AR" : "EN"}</span>
                    </button>
                    <button
                      onClick={() => { setShowPwdModal(true); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <KeyRound size={16} className="text-slate-400" />
                      {isRTL ? "تغيير كلمة السر" : "Change Password"}
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut size={16} />
                      {isRTL ? "تسجيل خروج" : "Sign Out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6 space-y-5">
        {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
        {success && <div className="alert alert-success"><CheckCircle2 size={16} />{success}</div>}
        {evalSuccess && <div className="alert alert-success"><CheckCircle2 size={16} />{evalSuccess}</div>}

        {!employee ? (
          <div className="card text-center py-16">
            <User size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">{text.selectFirst}</p>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* ── Sidebar: requests + on-leave ── */}
          <aside className="w-full xl:w-72 shrink-0 space-y-3 xl:order-last xl:sticky xl:top-4">
            <div className="card p-2">
              <button type="button" onClick={() => setReqOpen((o) => !o)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-start font-semibold text-slate-900">
                <Plus size={18} className="text-brand-600 flex-shrink-0" />
                <span className="flex-1">{isRTL ? "تقديم طلب" : "Request"}</span>
                <ChevronDown size={16} className={clsx("text-slate-400 transition-transform", reqOpen && "rotate-180")} />
              </button>
              {reqOpen && (
                <div className="mt-1 space-y-1">
                  <button type="button" onClick={() => { setShowLeaveModal(true); setReqOpen(false); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-start">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0"><Palmtree size={16} /></div>
                    <div className="text-sm font-medium text-slate-900">{text.requestLeave}</div>
                  </button>
                  <button type="button" onClick={() => { setShowPermModal(true); setReqOpen(false); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-start">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0"><Clock size={16} /></div>
                    <div className="text-sm font-medium text-slate-900">{isRTL ? "طلب مغادرة" : "Permission"}</div>
                  </button>
                  <button type="button" onClick={() => { setShowAdvModal(true); setReqOpen(false); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-start">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-base">💵</div>
                    <div className="text-sm font-medium text-slate-900">{isRTL ? "طلب سلفة" : "Request Advance"}</div>
                  </button>
                  <button type="button" onClick={() => { setShowOnlineModal(true); setReqOpen(false); loadCheckin(); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-start">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0"><Wifi size={16} /></div>
                    <div className="text-sm font-medium text-slate-900">{isRTL ? "طلب عمل أونلاين" : "Online Work"}</div>
                  </button>
                </div>
              )}
            </div>

            {orgEmployees.length > 0 && (
              <button type="button" onClick={() => setShowOrg(true)} className="card p-2 w-full flex items-center gap-2 hover:bg-slate-50 text-start">
                <Users size={18} className="text-brand-600 flex-shrink-0" />
                <span className="font-semibold text-slate-900">{isRTL ? "هيكل الشركة" : "Company Structure"}</span>
              </button>
            )}

            {onLeave.length > 0 && (
              <div className="card border-amber-200 bg-amber-50/40">
                <div className="card-header"><div className="card-title text-sm"><Palmtree size={15} className="text-amber-600" />{isRTL ? "زملاء في إجازة" : "On leave today"}<span className="badge badge-yellow text-[10px]">{onLeave.length}</span></div></div>
                <div className="space-y-2">
                  {onLeave.map((l) => (
                    <div key={l.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{(l.employee_name || "?").charAt(0).toUpperCase()}</div>
                      <div className="text-sm min-w-0"><div className="font-medium text-slate-900 truncate">{l.employee_name}</div><div className="text-[11px] text-slate-500">{isRTL ? "يعود" : "back"} {l.end_date}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {advances.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title text-sm"><span className="text-base">💵</span>{isRTL ? "حالة السلف" : "Advance status"}</div></div>
                <div className="space-y-2">
                  {advances.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900">{(parseFloat(a.amount) || 0).toFixed(2)}</span>
                      <span className={`badge text-[10px] ${a.status === "approved" ? "badge-green" : a.status === "rejected" ? "badge-red" : "badge-yellow"}`}>{a.status === "approved" ? (isRTL ? "موافق" : "Approved") : a.status === "rejected" ? (isRTL ? "مرفوض" : "Rejected") : (isRTL ? "معلّق" : "Pending")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.base}</div><div className="text-xl font-bold text-slate-900">{formatCurrency(myPayroll?.baseSalary || myPayroll?.base_salary || employee.baseSalary || employee.base_salary)}</div></div>
              <div className="card relative">
                <div className="text-xs font-semibold text-slate-500 mb-1">{text.net}</div>
                <div className="text-xl font-bold text-emerald-700">{formatCurrency(myPayroll?.netSalary || myPayroll?.net_salary)}</div>
                {myPayroll && (
                  <div className="absolute top-2 end-2">
                    <DownloadPayslipButton
                      compact
                      data={{
                        employeeName: employee?.name || "",
                        employeeId: String(employeeId),
                        companyName: savedUser.company_name || savedUser.companyName || (typeof window !== "undefined" ? localStorage.getItem("companyName") : "") || "PayNest",
                        month: myPayroll.periodMonth || myPayroll.period_month,
                        year: myPayroll.periodYear || myPayroll.period_year,
                        baseSalary: myPayroll.baseSalary || myPayroll.base_salary,
                        totalHours: myPayroll.totalHours || myPayroll.total_hours,
                        adjustment: myPayroll.adjustment,
                        bonusTotal: myPayroll.bonusTotal || myPayroll.bonus_total,
                        deductionTotal: myPayroll.deductionTotal || myPayroll.deduction_total,
                        socialSecurityDeduct: myPayroll.socialSecurityDeduct || myPayroll.social_security_deduct,
                        netSalary: myPayroll.netSalary || myPayroll.net_salary,
                      }}
                      filename={`payslip-${myPayroll.periodMonth || myPayroll.period_month}-${myPayroll.periodYear || myPayroll.period_year}.pdf`}
                    />
                  </div>
                )}
              </div>
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.deductions}</div><div className="text-xl font-bold text-rose-700">{formatCurrency(Math.max(0, -(parseFloat(myPayroll?.adjustment) || 0)) + (parseFloat(myPayroll?.deductionTotal || myPayroll?.deduction_total) || 0) + (parseFloat(myPayroll?.socialSecurityDeduct || myPayroll?.social_security_deduct) || 0))}</div></div>
              <div className="card"><div className="text-xs font-semibold text-slate-500 mb-1">{text.hoursDiff}</div><div className={clsx("text-xl font-bold", parseFloat(myPayroll?.hourDiff || myPayroll?.hour_diff || 0) < 0 ? "text-rose-700" : "text-emerald-700")}>{(parseFloat(myPayroll?.hourDiff || myPayroll?.hour_diff) || 0).toFixed(2)}</div></div>
            </div>

            {/* ── My Tasks card (reusable inline) ── */}
            {(() => {
              const activeMine = myTasks.filter((t) => t.status !== "completed");
              const doneMine = myTasks.filter((t) => t.status === "completed");

              const fullTaskCard = (task: any) => (
                <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{task.task_name || task.taskName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock size={12} />{formatDate(task.deadline)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={task.status} isRTL={isRTL} />
                      {task.status !== "completed" && (
                        <button className="btn btn-sm btn-success" onClick={() => updateTaskStatus(task.id, "completed")}>{isRTL ? "تم" : "Done"}</button>
                      )}
                    </div>
                  </div>
                  <TargetProgress task={task} isRTL={isRTL} onSave={(v) => updateTaskProgress(task.id, v)} />
                  <div className="flex items-center gap-3 mt-2">
                    {task.attachment ? (
                      <button type="button" onClick={() => openAttachment(task.attachment, task.attachmentName || task.attachment_name)}
                        className="text-[11px] text-brand-600 hover:underline flex items-center gap-1">
                        <Paperclip size={11} />{task.attachmentName || task.attachment_name || (isRTL ? "عرض الملف" : "View file")}
                      </button>
                    ) : (
                      <label className="text-[11px] text-slate-400 hover:text-brand-600 cursor-pointer flex items-center gap-1">
                        <Paperclip size={11} />{isRTL ? "إرفاق ملف" : "Attach file"}
                        <input type="file" className="hidden" onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          if (f.size > 5 * 1024 * 1024) { setError(isRTL ? "الملف أكبر من 5MB" : "File exceeds 5MB"); return; }
                          const b64 = await toBase64(f);
                          const res = await api.put(`/tasks/${task.id}`, { attachment: b64, attachment_name: f.name });
                          setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)));
                        }} />
                      </label>
                    )}
                  </div>
                </div>
              );

              const myTasksCard = (
                <div className="card h-full">
                  <div className="card-header"><div className="card-title"><CheckSquare size={16} className="text-brand-600" />{text.myTasks}</div>
                    {myTasks.length > 0 && <span className="text-[11px] text-slate-400">{activeMine.length} {isRTL ? "نشطة" : "active"}</span>}
                  </div>
                  {myTasks.length === 0 ? <div className="text-center py-8 text-sm text-slate-400">{text.noData}</div> : (
                    <div className="space-y-3">
                      {activeMine.length === 0 && (
                        <div className="text-center py-5 text-sm text-emerald-600 flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={15} />{isRTL ? "خلّصت كل مهامك! 🎉" : "All tasks done! 🎉"}
                        </div>
                      )}
                      {activeMine.map(fullTaskCard)}

                      {/* Completed — collapsed compact list */}
                      {doneMine.length > 0 && (
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                          <button type="button" onClick={() => setShowDoneMine((v) => !v)}
                            className="w-full flex items-center gap-2 p-2.5 hover:bg-slate-50 transition-colors text-start">
                            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                            <span className="text-sm font-semibold text-slate-700 flex-1">{isRTL ? "المنجزة" : "Completed"} ({doneMine.length})</span>
                            <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${showDoneMine ? "rotate-180" : ""}`} />
                          </button>
                          {showDoneMine && (
                            <div className="border-t border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
                              {doneMine.map((task) => {
                                const tgt = Number(task.targetValue ?? task.target_value);
                                const cur = Number(task.currentValue ?? task.current_value ?? 0);
                                return (
                                  <div key={task.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                    <span className="flex-1 min-w-0 truncate text-slate-700">{task.task_name || task.taskName}</span>
                                    {tgt > 0 && <span className="text-[11px] text-slate-400 shrink-0">{cur}/{tgt}{task.unit ? ` ${task.unit}` : ""}</span>}
                                    {task.attachment && (
                                      <button type="button" onClick={() => openAttachment(task.attachment, task.attachmentName || task.attachment_name)} className="text-brand-500 shrink-0"><Paperclip size={12} /></button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );

              const hasSupervisor = !!employee.supervisor;
              const hasSubordinates = employee.subordinates && employee.subordinates.length > 0;

              if (!hasSupervisor && !hasSubordinates) {
                // No supervisor data — show My Tasks alone in full width
                return myTasksCard;
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Left side: supervisor info + subordinates stacked */}
                  <div className="space-y-4">
                    {hasSupervisor && (
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
                    {hasSubordinates && (
                      <div className="card">
                        <div className="card-header flex-wrap gap-2">
                          <div className="card-title">
                            <Users size={16} className="text-brand-600" />
                            {isRTL ? "أنت تشرف على" : "You Supervise"}
                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              {employee.subordinates.length}
                            </span>
                          </div>
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
                                <button className="btn btn-sm btn-secondary shrink-0" onClick={() => openTaskModal(sub)}>
                                  <CheckSquare size={13} />{isRTL ? "مهمة" : "Task"}
                                </button>
                                <button className="btn btn-sm btn-primary shrink-0" onClick={() => openEvalModal(sub)}>
                                  <ClipboardList size={13} />
                                  {isDone ? (isRTL ? "تعديل" : "Edit") : (isRTL ? "تقييم" : "Evaluate")}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(
                      <div className="card">
                        <div className="card-header flex-wrap gap-2">
                          <div className="card-title">
                            <CheckSquare size={16} className="text-brand-600" />
                            {isRTL ? "مهام وأهداف الفريق" : "Team Tasks & Targets"}
                          </div>
                          <div className="flex items-center gap-1.5 ms-auto">
                            <select className="form-select text-xs py-1 px-2 h-7 w-24" value={teamMonth} onChange={(e) => setTeamMonth(+e.target.value)}>
                              {(isRTL ? MONTHS_AR : MONTHS_EN).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                            <select className="form-select text-xs py-1 px-2 h-7 w-20" value={teamYear} onChange={(e) => setTeamYear(+e.target.value)}>
                              {[teamYear - 1, teamYear, teamYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>
                        {teamBySub.length === 0 && (
                          <div className="text-center py-6 text-sm text-slate-400">{isRTL ? "لا مهام في هذا الشهر" : "No tasks this month"}</div>
                        )}
                        <div className="space-y-2">
                          {teamBySub.map(({ sub, eid, tasks: subTasks, avgPct, doneCount, total, nextDeadline }: any) => {
                            const open = expandedSub === eid;
                            return (
                              <div key={eid} className="rounded-lg border border-slate-200 overflow-hidden">
                                {/* Employee row (click to expand) */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedSub(open ? null : eid)}
                                  className="w-full flex items-center gap-2.5 p-2.5 hover:bg-slate-50 transition-colors text-start"
                                >
                                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {(sub.name || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-slate-900 text-sm truncate">{sub.name}</div>
                                    <div className="text-[11px] text-slate-500">
                                      {total} {isRTL ? "مهمة" : "tasks"} · {doneCount} {isRTL ? "منجزة" : "done"}
                                      {avgPct != null && <span className="text-brand-600 font-semibold"> · {avgPct}%</span>}
                                    </div>
                                    {nextDeadline && (
                                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Clock size={10} />{isRTL ? "أقرب موعد:" : "Next:"} {formatDate(nextDeadline)}</div>
                                    )}
                                  </div>
                                  {avgPct != null && (
                                    <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                                      <div className={`h-full rounded-full ${avgPct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${avgPct}%` }} />
                                    </div>
                                  )}
                                  <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                                </button>
                                {/* Expanded: that employee's tasks */}
                                {open && (
                                  <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 space-y-2">
                                    {subTasks.map((task: any) => (
                                      <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="font-semibold text-slate-900 text-sm">{task.task_name || task.taskName}</div>
                                          <StatusBadge status={task.status} isRTL={isRTL} />
                                        </div>
                                        {task.deadline && (
                                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><Clock size={11} />{formatDate(task.deadline)}</div>
                                        )}
                                        {(task.attachment) && (
                                          <button type="button" onClick={() => openAttachment(task.attachment, task.attachmentName || task.attachment_name)}
                                            className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 mt-1">
                                            <Paperclip size={11} />{task.attachmentName || task.attachment_name || (isRTL ? "عرض الملف" : "View file")}
                                          </button>
                                        )}
                                        <TargetProgress task={task} isRTL={isRTL} onSave={(v) => updateTaskProgress(task.id, v)} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Right side: My Tasks */}
                  {myTasksCard}
                </div>
              );
            })()}


            {/* ── Request Leave modal ── */}
            {showLeaveModal && (
            <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLeaveModal(false); }}>
              <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
                <div className="card-header"><div className="card-title"><Palmtree size={16} className="text-brand-600" />{text.requestLeave}</div><button type="button" onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button></div>
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
                  <div>
                    <label className="form-label">{text.reason}</label>
                    <textarea rows={2} className="form-textarea" value={leaveForm.reason} onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label flex items-center gap-1.5"><Paperclip size={13} />{isRTL ? "إرفاق ملف (شهادة طبية / موافقة واتساب)" : "Attach file (medical cert / WhatsApp approval)"}</label>
                    <label className={`flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-4 py-3 text-sm transition-all ${leaveForm.attachment ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-brand-400"}`}>
                      <Paperclip size={15} />
                      {leaveForm.attachment ? (isRTL ? "✓ تم إرفاق الملف" : "✓ File attached") : (isRTL ? "اضغط لاختيار ملف (صورة أو PDF)" : "Click to choose file (image or PDF)")}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleAttachment} />
                    </label>
                    {leaveForm.attachment && (
                      <button type="button" className="text-xs text-rose-500 mt-1 hover:underline" onClick={() => setLeaveForm((f) => ({ ...f, attachment: "" }))}>
                        {isRTL ? "حذف الملف" : "Remove file"}
                      </button>
                    )}
                  </div>
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
            </div>
            )}

            {/* ── Permission modal ── */}
            {showPermModal && (
            <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPermModal(false); }}>
              <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
                <div className="card-header">
                  <div className="card-title">
                    <Clock size={16} className="text-amber-500" />
                    {isRTL ? "طلب إذن مغادرة" : "Permission Request"}
                  </div>
                  <button type="button" onClick={() => setShowPermModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>
                <form className="space-y-4" onSubmit={submitPermission}>
                  <div>
                    <label className="form-label">{isRTL ? "التاريخ" : "Date"}</label>
                    <input type="date" required className="form-input" value={permForm.date} onChange={(e) => setPermForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">{isRTL ? "مدة المغادرة" : "Duration"}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["1", "2", "3"].map((h) => (
                        <button type="button" key={h} onClick={() => setPermForm((f) => ({ ...f, hours: h }))}
                          className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                            permForm.hours === h
                              ? "border-amber-400 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-white text-slate-500 hover:border-amber-300"
                          }`}>
                          {h} {isRTL ? (h === "1" ? "ساعة" : "ساعات") : (h === "1" ? "hour" : "hours")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{isRTL ? "السبب" : "Reason"}</label>
                    <textarea className="form-textarea" rows={3} placeholder={isRTL ? "اكتب سبب المغادرة..." : "Enter reason..."} value={permForm.reason} onChange={(e) => setPermForm((f) => ({ ...f, reason: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label flex items-center gap-1.5"><Paperclip size={13} />{isRTL ? "إرفاق ملف (اختياري)" : "Attach file (optional)"}</label>
                    <label className={`flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-4 py-3 text-sm transition-all ${permForm.attachment ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-amber-400"}`}>
                      <Paperclip size={15} />
                      {permForm.attachment ? (isRTL ? "✓ تم إرفاق الملف" : "✓ File attached") : (isRTL ? "اضغط لاختيار ملف (صورة أو PDF)" : "Click to choose file (image or PDF)")}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handlePermAttachment} />
                    </label>
                    {permForm.attachment && (
                      <button type="button" className="text-xs text-rose-500 mt-1 hover:underline" onClick={() => setPermForm((f) => ({ ...f, attachment: "" }))}>
                        {isRTL ? "إزالة الملف" : "Remove file"}
                      </button>
                    )}
                  </div>
                  {/* note */}
                  <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
                    {isRTL
                      ? "⚠️ الإذن يكون لمدة ساعة أو ساعتين أو ثلاث ساعات كحد أقصى. في حال الحاجة إلى أكثر من ذلك، يُعتبر الغياب إجازة يوم كامل ويجب تقديم طلب إجازة."
                      : "⚠️ Permission is granted for 1–3 hours only. If you need more than 3 hours, it counts as a full-day leave and a leave request must be submitted instead."}
                  </p>
                  {permError && <div className="alert alert-error"><AlertTriangle size={14} />{permError}</div>}
                  {permSuccess && <div className="alert alert-success"><CheckCircle2 size={14} />{permSuccess}</div>}
                  <button className="btn w-full bg-amber-500 hover:bg-amber-600 text-white gap-2 mt-auto" disabled={permSaving}>
                    {permSaving ? <span className="spinner" /> : <Send size={15} />}
                    {isRTL ? "إرسال طلب المغادرة" : "Send Permission Request"}
                  </button>
                </form>
              </div>
            </div>
            )}

            {/* ── Request Advance modal ── */}
            {showOnlineModal && (
            <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowOnlineModal(false); }}>
              <div className="card w-full max-w-md" dir={isRTL ? "rtl" : "ltr"}>
                <div className="card-header"><div className="card-title"><Wifi size={16} className="text-sky-600" />{isRTL ? "طلب عمل أونلاين" : "Online Work Request"}</div><button type="button" onClick={() => setShowOnlineModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button></div>
                <form className="space-y-4" onSubmit={submitOnline}>
                  <p className="text-xs text-slate-500">{isRTL ? "اطلب يوم عمل أونلاين — يروح للموارد البشرية للموافقة. عند الموافقة يُحتسب حضور كامل لذلك اليوم." : "Request an online workday — sent to HR for approval. Once approved it counts as a full attendance day."}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">{isRTL ? "من تاريخ" : "From"}</label><input type="date" className="form-input" value={onlineForm.start} onChange={(e) => setOnlineForm((f) => ({ ...f, start: e.target.value }))} /></div>
                    <div><label className="form-label">{isRTL ? "إلى تاريخ" : "To"}</label><input type="date" className="form-input" value={onlineForm.end} onChange={(e) => setOnlineForm((f) => ({ ...f, end: e.target.value }))} /></div>
                  </div>
                  <div><label className="form-label">{isRTL ? "ملاحظة (اختياري)" : "Note (optional)"}</label><textarea rows={2} className="form-textarea" value={onlineForm.reason} onChange={(e) => setOnlineForm((f) => ({ ...f, reason: e.target.value }))} /></div>
                  <button className="btn btn-primary w-full" disabled={checkinBusy}>{checkinBusy ? <span className="spinner" /> : <Send size={15} />}{isRTL ? "إرسال الطلب" : "Send request"}</button>
                </form>

                {/* Check in / out for today's online work */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 mb-2">{isRTL ? "تسجيل حضور اليوم (أونلاين)" : "Today's online attendance"}</div>
                  <div className="grid grid-cols-2 gap-3 text-center mb-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <div className="text-[11px] text-slate-500">{isRTL ? "الدخول" : "Check in"}</div>
                      <div className="text-base font-bold text-slate-900">{checkin?.clock_in || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <div className="text-[11px] text-slate-500">{isRTL ? "الخروج" : "Check out"}</div>
                      <div className="text-base font-bold text-slate-900">{checkin?.clock_out || "—"}</div>
                    </div>
                  </div>
                  {checkin?.clock_in && checkin?.clock_out && (
                    <div className="text-center text-xs text-emerald-600 font-semibold mb-2">{isRTL ? "ساعات اليوم" : "Hours today"}: {checkin.hours_worked}</div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" disabled={checkinBusy || !!checkin?.clock_in} onClick={() => doCheck("in")} className="btn btn-success flex-1 disabled:opacity-50">{isRTL ? "تسجيل دخول" : "Check in"}</button>
                    <button type="button" disabled={checkinBusy || !checkin?.clock_in || !!checkin?.clock_out} onClick={() => doCheck("out")} className="btn btn-primary flex-1 disabled:opacity-50">{isRTL ? "تسجيل خروج" : "Check out"}</button>
                  </div>
                </div>
              </div>
            </div>
            )}

            {showAdvModal && (
            <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAdvModal(false); }}>
              <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
                <div className="card-header"><div className="card-title"><span className="text-base">💵</span>{isRTL ? "طلب سلفة" : "Request Advance"}</div><button type="button" onClick={() => setShowAdvModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button></div>
                <form onSubmit={submitAdvance} className="space-y-3">
                  <div>
                    <label className="form-label">{isRTL ? "المبلغ" : "Amount"} *</label>
                    <input type="number" min="1" step="0.01" className="form-input" placeholder="0.00" value={advForm.amount} onChange={(e) => setAdvForm((f) => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">{isRTL ? "السداد على" : "Repay over"}</label>
                    <select className="form-input" value={advForm.installments} onChange={(e) => setAdvForm((f) => ({ ...f, installments: e.target.value }))}>
                      <option value="1">{isRTL ? "دفعة واحدة (الشهر القادم)" : "One-time (next month)"}</option>
                      {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {isRTL ? "أشهر" : "months"}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">{isRTL ? "السبب" : "Reason"}</label>
                    <textarea className="form-textarea" rows={2} placeholder={isRTL ? "سبب السلفة..." : "Reason..."} value={advForm.reason} onChange={(e) => setAdvForm((f) => ({ ...f, reason: e.target.value }))} />
                  </div>
                  {advForm.amount && parseFloat(advForm.amount) > 0 && parseInt(advForm.installments) > 1 && (
                    <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      {isRTL ? `سيُخصم تقريباً ${(parseFloat(advForm.amount) / parseInt(advForm.installments)).toFixed(2)} شهرياً لمدة ${advForm.installments} أشهر.` : `≈ ${(parseFloat(advForm.amount) / parseInt(advForm.installments)).toFixed(2)} deducted monthly for ${advForm.installments} months.`}
                    </p>
                  )}
                  {advError && <div className="alert alert-error"><AlertTriangle size={14} />{advError}</div>}
                  {advSuccess && <div className="alert alert-success"><CheckCircle2 size={14} />{advSuccess}</div>}
                  <button className="btn w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2" disabled={advSaving}>
                    {advSaving ? <span className="spinner" /> : <Send size={15} />}{isRTL ? "إرسال طلب السلفة" : "Send Advance Request"}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">{isRTL ? "يصل الطلب للموارد البشرية، وعند الموافقة يُخصم من راتبك." : "Goes to HR; once approved it's deducted from your salary."}</p>
                </form>
              </div>
            </div>
            )}

            {/* ── Subordinate leave requests (supervisor view) ────────── */}
            {subLeaves.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <Calendar size={16} className="text-brand-600" />
                    {isRTL ? "طلبات إجازة موظفيك" : "Team Leave Requests"}
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                      {subLeaves.filter((l) => l.supervisorStatus === "pending").length} {isRTL ? "بانتظار موافقتك" : "pending"}
                    </span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>{isRTL ? "الموظف" : "Employee"}</th>
                        <th>{isRTL ? "النوع" : "Type"}</th>
                        <th>{isRTL ? "من" : "From"}</th>
                        <th>{isRTL ? "إلى" : "To"}</th>
                        <th>{isRTL ? "المدة" : "Duration"}</th>
                        <th>{isRTL ? "حالة HR" : "HR"}</th>
                        <th>{isRTL ? "إجراء" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subLeaves.map((leave) => {
                        const isPerm = leave.leaveType === "permission" || leave.leave_type === "permission";
                        const lType  = leave.leaveType || leave.leave_type || "";
                        const typeLabel = isPerm ? (isRTL ? "إذن مغادرة" : "Permission")
                          : lType === "annual" ? (isRTL ? "سنوية" : "Annual")
                          : lType === "sick"   ? (isRTL ? "مرضية" : "Sick")
                          : lType === "unpaid" ? (isRTL ? "بدون راتب" : "Unpaid")
                          : lType === "online" ? (isRTL ? "عمل أونلاين" : "Online")
                          : lType;
                        const dc = leave.daysCount ?? leave.days_count ?? 0;
                        const duration = isPerm
                          ? `${dc} ${isRTL ? (dc === 1 ? "ساعة" : "ساعات") : (dc === 1 ? "hr" : "hrs")}`
                          : `${dc} ${isRTL ? "يوم" : "days"}`;
                        const supStatus = leave.supervisorStatus ?? leave.supervisor_status ?? "pending";
                        const hrStatus  = leave.hrStatus ?? leave.hr_status ?? "pending";
                        const attUrl    = leave.attachmentUrl ?? leave.attachment_url;
                        return (
                          <tr key={leave.id}>
                            <td className="font-medium">{leave.employeeName || leave.employee_name || leave.employeeId}</td>
                            <td>{typeLabel}</td>
                            <td>{formatDate(leave.startDate || leave.start_date)}</td>
                            <td>{isPerm ? "-" : formatDate(leave.endDate || leave.end_date)}</td>
                            <td>{duration}</td>
                            <td>
                              <span className={`badge ${hrStatus === "approved" ? "badge-green" : hrStatus === "rejected" ? "badge-red" : "badge-yellow"}`}>
                                {hrStatus === "approved" ? (isRTL ? "وافق" : "OK") : hrStatus === "rejected" ? (isRTL ? "رفض" : "Rej") : (isRTL ? "انتظار" : "Wait")}
                              </span>
                            </td>
                            <td>
                              {attUrl && (
                                <a href={attUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 text-xs hover:underline me-2">
                                  <Paperclip size={11} />{isRTL ? "ملف" : "File"}
                                </a>
                              )}
                              {supStatus === "pending" ? (
                                <div className="flex gap-1">
                                  <button onClick={() => approveSubLeave(leave.id, true)} className="btn btn-sm bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                                    <ThumbsUp size={12} />{isRTL ? "موافق" : "Approve"}
                                  </button>
                                  <button onClick={() => approveSubLeave(leave.id, false)} className="btn btn-sm bg-rose-500 hover:bg-rose-600 text-white gap-1">
                                    <ThumbsDown size={12} />{isRTL ? "رفض" : "Reject"}
                                  </button>
                                </div>
                              ) : (
                                <span className={`badge ${supStatus === "approved" ? "badge-green" : "badge-red"}`}>
                                  {supStatus === "approved" ? (isRTL ? "وافقت" : "Approved") : (isRTL ? "رفضت" : "Rejected")}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header"><div className="card-title"><Calendar size={16} className="text-brand-600" />{text.myLeaves}</div></div>
              {myLeaves.length === 0 ? <div className="text-center py-8 text-sm text-slate-400">{text.noData}</div> : (
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>{text.leaveType}</th><th>{text.startDate}</th><th>{text.endDate}</th><th>{isRTL ? "المدة" : "Duration"}</th><th>{isRTL ? "الحالة" : "Status"}</th></tr></thead>
                    <tbody>
                      {myLeaves.map((leave) => {
                        const lType   = leave.leaveType   || leave.leave_type   || "";
                        const sDate   = leave.startDate   || leave.start_date;
                        const eDate   = leave.endDate     || leave.end_date;
                        const dCount  = leave.daysCount   ?? leave.days_count;
                        const isPerm  = lType === "permission";
                        const typeLabel = isPerm
                          ? (isRTL ? "إذن مغادرة" : "Permission")
                          : lType === "annual"
                            ? (isRTL ? "سنوية" : "Annual")
                            : lType === "sick"
                              ? (isRTL ? "مرضية" : "Sick")
                              : lType === "unpaid"
                                ? (isRTL ? "بدون راتب" : "Unpaid")
                                : lType === "online"
                                  ? (isRTL ? "عمل أونلاين" : "Online")
                                  : lType;
                        const duration = isPerm
                          ? `${dCount} ${isRTL ? (dCount === 1 ? "ساعة" : "ساعات") : (dCount === 1 ? "hr" : "hrs")}`
                          : `${dCount} ${isRTL ? "يوم" : "days"}`;
                        return (
                        <tr key={leave.id}>
                          <td>
                            {isPerm
                              ? <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-medium"><Clock size={11}/>{typeLabel}</span>
                              : typeLabel}
                          </td>
                          <td>{formatDate(sDate)}</td>
                          <td>{isPerm ? "-" : formatDate(eDate)}</td>
                          <td>{duration}</td>
                          <td><StatusBadge status={leave.status} isRTL={isRTL} /></td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Announcements full width ───────────────────────────────── */}
            <div className="card">
              <div className="card-header"><div className="card-title"><Bell size={16} className="text-brand-600" />{text.announcements}</div></div>
              {announcements.length === 0 ? <div className="text-center py-6 text-sm text-slate-400">{text.noData}</div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        )}
      </main>

      {/* Company structure modal */}
      {showOrg && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowOrg(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900"><Users size={18} className="text-brand-600" />{isRTL ? "هيكل الشركة" : "Company Structure"}</div>
              <button onClick={() => setShowOrg(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="flex-1 min-h-0">
              <OrgChart employees={orgEmployees} isRTL={isRTL} />
            </div>
          </div>
        </div>
      )}

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

                {/* Automatic bonus (derived from grade tiers, set by HR/owner) */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 font-medium">
                      {isRTL ? "المكافأة التلقائية" : "Automatic Bonus"}
                    </span>
                    <strong className="text-emerald-600">
                      {evalBonusForGrade(evalGradeFromScores(evalScores), evalTiers)} {isRTL ? "د.أ" : "JD"}
                    </strong>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {evalTiers.length
                      ? (isRTL ? "تُحتسب تلقائياً حسب الدرجة وشرائح المكافأة." : "Applied automatically based on the grade and bonus tiers.")
                      : (isRTL ? "لم يتم تحديد شرائح مكافأة بعد." : "No bonus tiers configured yet.")}
                  </p>
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
                    <span className="text-slate-500">{isRTL ? "الدرجة" : "Grade"}: </span>
                    <strong className="text-brand-700">
                      {((Object.values(evalScores).reduce((a, b) => a + b, 0) / (EVAL_CRITERIA.length * 5)) * 100).toFixed(1)} / 100
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

      {/* ── Task Assignment Modal ─────────────────────────────────────── */}
      {showTaskModal && taskSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir={isRTL ? "rtl" : "ltr"}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-brand-600" />
                <span className="font-bold text-slate-900">
                  {isRTL ? "تعيين مهمة" : "Assign Task"}
                </span>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Subordinate info */}
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                {(taskSub.name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900">{taskSub.name}</div>
                <div className="text-xs text-slate-500">{taskSub.email || taskSub.employeeId || taskSub.employee_id}</div>
              </div>
            </div>

            <form onSubmit={submitTask} className="px-6 py-5 space-y-4">
              {/* Task name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  {isRTL ? "اسم المهمة" : "Task Name"} *
                </label>
                <input
                  type="text"
                  required
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder={isRTL ? "أدخل اسم المهمة..." : "Enter task name..."}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  {isRTL ? "الموعد النهائي (اختياري)" : "Deadline (optional)"}
                </label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              {/* Measurable target (optional) — independent of evaluation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    {isRTL ? "هدف رقمي (اختياري)" : "Target value (optional)"}
                  </label>
                  <input
                    type="number" step="any" value={taskTarget}
                    onChange={(e) => setTaskTarget(e.target.value)}
                    placeholder={isRTL ? "مثال: 10" : "e.g. 10"}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    {isRTL ? "الوحدة (اختياري)" : "Unit (optional)"}
                  </label>
                  <input
                    type="text" value={taskUnit}
                    onChange={(e) => setTaskUnit(e.target.value)}
                    placeholder={isRTL ? "مثال: مبيعات" : "e.g. sales"}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                </div>
              </div>

              {/* Attachment (any file type) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  {isRTL ? "إرفاق ملف (اختياري)" : "Attach file (optional)"}
                </label>
                <label className={`flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-4 py-2.5 text-sm transition-all ${taskAttachment ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-brand-400"}`}>
                  <Paperclip size={15} />
                  {taskAttachment ? `✓ ${taskAttachmentName}` : (isRTL ? "اضغط لاختيار ملف (أي نوع)" : "Click to choose a file (any type)")}
                  <input type="file" className="hidden" onChange={handleTaskAttachment} />
                </label>
                {taskAttachment && (
                  <button type="button" className="text-xs text-rose-500 mt-1 hover:underline" onClick={() => { setTaskAttachment(""); setTaskAttachmentName(""); }}>
                    {isRTL ? "حذف الملف" : "Remove file"}
                  </button>
                )}
              </div>

              {taskError && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2">
                  {taskError}
                </div>
              )}
              {taskSuccess && (
                <div className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 flex items-center gap-2">
                  <CheckCircle2 size={15} /> {taskSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                  {isRTL ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" className="btn btn-primary" disabled={taskSaving}>
                  {taskSaving
                    ? <><span className="spinner" />{isRTL ? "جاري الإضافة..." : "Saving..."}</>
                    : <><CheckSquare size={15} />{isRTL ? "إضافة المهمة" : "Assign Task"}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={(e) => { if (e.target === e.currentTarget) setShowPwdModal(false); }} dir={isRTL ? "rtl" : "ltr"}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound size={17} className="text-brand-600" />
                <h3 className="font-bold text-slate-900">{isRTL ? "تغيير كلمة السر" : "Change Password"}</h3>
              </div>
              <button onClick={() => setShowPwdModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <form onSubmit={changePassword} className="px-5 py-5 space-y-3">
              <div>
                <label className="form-label">{isRTL ? "كلمة السر الحالية" : "Current Password"}</label>
                <input type="password" required className="form-input" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} />
              </div>
              <div>
                <label className="form-label">{isRTL ? "كلمة السر الجديدة" : "New Password"}</label>
                <input type="password" required className="form-input" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
              </div>
              <div>
                <label className="form-label">{isRTL ? "تأكيد كلمة السر" : "Confirm Password"}</label>
                <input type="password" required className="form-input" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
              </div>
              {pwdError && <div className="text-rose-600 text-sm bg-rose-50 rounded-lg px-3 py-2">{pwdError}</div>}
              {pwdSuccess && <div className="text-emerald-700 text-sm bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 size={14} /> {pwdSuccess}</div>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPwdModal(false)}>{isRTL ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
                  {pwdSaving ? <span className="spinner" /> : <KeyRound size={14} />}
                  {isRTL ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
