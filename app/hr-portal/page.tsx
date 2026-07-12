"use client";

/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import {
  Users, Bell, CheckSquare, Calendar, LogOut, Menu, X,
  Plus, AlertTriangle, CheckCircle2, ChevronDown, Shield,
  Edit2, Trash2, Phone, Mail, Hash, FileText, CheckCircle,
  Upload, ChevronRight, Languages, KeyRound, Eye, EyeOff,
} from "lucide-react";
import clsx from "clsx";
import api, { apiPostForm } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/* ─── helpers ─── */
function formatCurrency(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const COUNTRIES = [
  { code: "JO", dial: "+962", flag: "🇯🇴" }, { code: "SA", dial: "+966", flag: "🇸🇦" },
  { code: "AE", dial: "+971", flag: "🇦🇪" }, { code: "KW", dial: "+965", flag: "🇰🇼" },
  { code: "EG", dial: "+20",  flag: "🇪🇬" }, { code: "LB", dial: "+961", flag: "🇱🇧" },
  { code: "PS", dial: "+970", flag: "🇵🇸" }, { code: "US", dial: "+1",   flag: "🇺🇸" },
];

const DOC_TYPES = [
  { key: "certificate", ar: "شهادة / مؤهل",    en: "Certificate / Degree" },
  { key: "transcript",  ar: "كشف العلامات",     en: "Academic Transcript" },
  { key: "no_criminal", ar: "عدم المحكومية",    en: "No Criminal Record" },
  { key: "medical",     ar: "الإفصاح الطبي",    en: "Medical Disclosure" },
  { key: "health",      ar: "خلو من الأمراض",   en: "Health Certificate" },
];

const religionOptions = [
  { value: "muslim", ar: "مسلم", en: "Muslim" },
  { value: "christian", ar: "مسيحي", en: "Christian" },
  { value: "buddhist", ar: "بوذي", en: "Buddhist" },
];

function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const dialMatch = COUNTRIES.find((c) => value.startsWith(c.dial));
  const [dialCode, setDialCode] = useState(dialMatch?.dial ?? "+962");
  const [local, setLocal] = useState(dialMatch ? value.slice(dialMatch.dial.length) : value);
  const handleDial = (d: string) => { setDialCode(d); onChange(d + local); };
  const handleLocal = (v: string) => { setLocal(v); onChange(dialCode + v); };
  return (
    <div className="flex gap-2">
      <select className="form-input w-28 flex-shrink-0" value={dialCode} onChange={(e) => handleDial(e.target.value)}>
        {COUNTRIES.map((c) => <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>)}
      </select>
      <input type="tel" className="form-input flex-1" placeholder="7XXXXXXXX" value={local} onChange={(e) => handleLocal(e.target.value)} />
    </div>
  );
}

const TABS = ["employees", "leaves", "tasks", "announcements"] as const;
type Tab = typeof TABS[number];

export default function HRPortalPage() {
  const { t, lang, toggleLanguage, isRTL } = useLanguage();
  const ar = lang === "ar";

  const [user] = useState(() => typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {});
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("employees");
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdVisible, setPwdVisible] = useState({ current: false, next: false, confirm: false });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  /* ─── data ─── */
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ─── employee detail / add / edit ─── */
  const [selectedId, setSelectedId] = useState("");
  const [empDocs, setEmpDocs] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const emptyForm = { employee_id: "", name: "", email: "", phone: "", base_salary: "", department: "", department_number: "", join_date: "", contract_end_date: "", social_security: false, religion: "" };
  const [form, setForm] = useState({ ...emptyForm });
  const [createdEmpId, setCreatedEmpId] = useState("");
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [docUploading, setDocUploading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ─── leave action ─── */
  const [leaveBusy, setLeaveBusy] = useState<number | null>(null);

  /* ─── task state ─── */
  const [taskBusy, setTaskBusy] = useState<number | null>(null);

  /* ─── load data ─── */
  const load = async () => {
    setLoading(true);
    try {
      const [empRes, leavesRes, tasksRes, annRes, balRes] = await Promise.all([
        api.get("/employees"),
        api.get("/leaves"),
        api.get("/tasks"),
        api.get("/announcements"),
        api.get("/leaves/balances"),
      ]);
      const list = empRes.data || [];
      setEmployees(list);
      setLeaves(leavesRes.data || []);
      setTasks(tasksRes.data || []);
      setAnnouncements(annRes.data || []);
      setBalances(balRes.data || []);
      if (!selectedId && list.length) setSelectedId(list[0].employee_id);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadDocs = async (id: string) => {
    try { const r = await api.get(`/employees/${id}/documents`); setEmpDocs(r.data || []); } catch { setEmpDocs([]); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedId) loadDocs(selectedId); }, [selectedId]);

  const signOut = () => {
    ["token", "paynest_logged_in", "role", "user", "paynest_employee_id"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/";
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (!pwdNew || pwdNew.length < 6) {
      setPwdError(ar ? "كلمة السر الجديدة لازم تكون 6 أحرف أو أكثر" : "New password must be at least 6 characters");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError(ar ? "كلمة السر الجديدة غير متطابقة" : "New passwords do not match");
      return;
    }
    try {
      setPwdSaving(true);
      await api.put("/auth/change-password", { currentPassword: pwdCurrent, newPassword: pwdNew });
      setPwdSuccess(ar ? "تم تغيير كلمة السر" : "Password changed");
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      setTimeout(() => setShowPwdModal(false), 800);
    } catch (err: any) {
      setPwdError(err.message || (ar ? "فشل تغيير كلمة السر" : "Failed to change password"));
    } finally {
      setPwdSaving(false);
    }
  };

  const selectedEmployee = employees.find((e) => e.employee_id === selectedId) || null;
  const selectedBalance = balances.find((b) => b.employee_id === selectedId) || null;

  const religionLabel = (v: string) => {
    const item = religionOptions.find((r) => r.value === v);
    if (!item) return ar ? "غير محدد" : "Not selected";
    return (item as any)[lang] || item.en;
  };

  /* ─── add employee step 1 ─── */
  const handleAddStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.name || !form.email || !form.base_salary) { setError(ar ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields"); return; }
    try {
      await api.post("/employees", { ...form, base_salary: parseFloat(form.base_salary) });
      setCreatedEmpId(form.employee_id);
      setAddStep(2); setError("");
    } catch (e: any) { setError(e.message); }
  };

  const handleUploadDocs = async () => {
    setDocUploading(true);
    for (const dt of DOC_TYPES) {
      const file = docFiles[dt.key];
      if (!file) continue;
      const fd = new FormData(); fd.append("file", file); fd.append("documentType", dt.key);
      await apiPostForm(`/employees/${createdEmpId}/documents`, fd).catch(() => {});
    }
    setDocUploading(false);
    setSuccess(ar ? "تمت إضافة الموظف بنجاح" : "Employee added successfully");
    setShowAdd(false); setAddStep(1); setForm({ ...emptyForm }); setDocFiles({});
    await load(); setSelectedId(createdEmpId);
  };

  /* ─── edit ─── */
  const openEdit = () => {
    if (!selectedEmployee) return;
    setEditForm({
      employee_id: selectedEmployee.employee_id || "",
      name: selectedEmployee.name || "",
      email: selectedEmployee.email || "",
      phone: selectedEmployee.phone || "",
      base_salary: selectedEmployee.base_salary || "",
      department: selectedEmployee.department || "",
      department_number: selectedEmployee.department_number || "",
      join_date: selectedEmployee.join_date ? String(selectedEmployee.join_date).substring(0, 10) : "",
      contract_end_date: selectedEmployee.contract_end_date ? String(selectedEmployee.contract_end_date).substring(0, 10) : "",
      social_security: !!selectedEmployee.social_security,
      religion: selectedEmployee.religion || "",
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSavingEdit(true);
    try {
      const res = await api.put(`/employees/${selectedEmployee.employee_id}`, { ...editForm, base_salary: parseFloat(editForm.base_salary) });
      setEmployees((p) => p.map((emp) => emp.employee_id === selectedEmployee.employee_id ? res.data : emp));
      setSelectedId(res.data.employee_id);
      setSuccess(ar ? "تم تعديل بيانات الموظف" : "Employee updated"); setShowEdit(false);
    } catch (e: any) { setError(e.message); }
    finally { setSavingEdit(false); }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    setDeleting(true);
    try {
      await api.delete(`/employees/${selectedEmployee.employee_id}`);
      const next = employees.filter((e) => e.employee_id !== selectedEmployee.employee_id);
      setEmployees(next); setSelectedId(next[0]?.employee_id || ""); setShowDel(false);
      setSuccess(ar ? "تم حذف الموظف" : "Employee deleted");
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); }
  };

  /* ─── leave actions ─── */
  const handleLeave = async (id: number, status: "approved" | "rejected") => {
    setLeaveBusy(id);
    try { await api.patch(`/leaves/${id}`, { status }); await load(); setSuccess(ar ? "تم تحديث الإجازة" : "Leave updated"); }
    catch (e: any) { setError(e.message); }
    finally { setLeaveBusy(null); }
  };

  /* ─── task toggle ─── */
  const toggleTask = async (task: any) => {
    setTaskBusy(task.id);
    try {
      const newStatus = task.status === "completed" ? "pending" : "completed";
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      setTasks((p) => p.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (e: any) { setError(e.message); }
    finally { setTaskBusy(null); }
  };

  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const openTasksCount = tasks.filter((t) => t.status !== "completed").length;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><span className="spinner spinner-dark w-6 h-6" /></div>;

  const TAB_CONFIG = [
    { key: "employees",     label: ar ? "الموظفون" : "Employees",     icon: Users,     badge: employees.length },
    { key: "leaves",        label: ar ? "الإجازات" : "Leaves",         icon: Calendar,  badge: pendingLeaves },
    { key: "tasks",         label: ar ? "المهام" : "Tasks",            icon: CheckSquare, badge: openTasksCount },
    { key: "announcements", label: ar ? "الإعلانات" : "Announcements", icon: Bell,      badge: announcements.length },
  ] as const;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black text-sm">HR</div>
          <span className="font-bold text-slate-900 hidden sm:block">
            Pay<span className="text-brand-600">Nest</span>
            <span className="ml-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">{ar ? "بوابة الموارد البشرية" : "HR Portal"}</span>
          </span>
        </div>

        {/* Profile */}
        <div className="relative">
          <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {(user.name || "H")[0].toUpperCase()}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{user.name || "HR"}</div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">HR</div>
            </div>
            <ChevronDown size={14} className={clsx("text-slate-400 transition-transform flex-shrink-0", profileOpen && "rotate-180")} />
          </button>

          {profileOpen && (
            <div className={clsx("absolute top-full mt-2 w-56 bg-white rounded-xl shadow-elevated border border-slate-200 overflow-hidden z-50", isRTL ? "left-0" : "right-0")}>
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="font-semibold text-slate-900 truncate">{user.name || "HR"}</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">{user.email || "-"}</div>
                <div className="mt-1.5 inline-flex px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold uppercase">HR</div>
              </div>
              <div className="p-2 space-y-0.5">
                <button onClick={() => { toggleLanguage(); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                  <Languages size={16} className="text-slate-400" />
                  <span>{lang === "en" ? "العربية" : "English"}</span>
                  <span className="ml-auto text-[11px] font-bold text-slate-400 uppercase">{lang === "en" ? "AR" : "EN"}</span>
                </button>
                <button onClick={() => { setShowPwdModal(true); setProfileOpen(false); setPwdError(""); setPwdSuccess(""); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                  <KeyRound size={16} className="text-slate-400" />
                  <span>{ar ? "تغيير كلمة السر" : "Change Password"}</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-600 hover:bg-rose-50">
                  <LogOut size={16} />
                  {ar ? "تسجيل خروج" : "Sign Out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")} className="ml-auto"><X size={14} /></button></div>}
        {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")} className="ml-auto"><X size={14} /></button></div>}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TAB_CONFIG.map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={clsx("card p-4 flex items-center gap-3 text-left transition-all", tab === key ? "ring-2 ring-brand-500 bg-brand-50" : "hover:shadow-elevated")}>
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", tab === key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500")}>
                <Icon size={18} />
              </div>
              <div>
                <div className={clsx("text-xl font-bold", tab === key ? "text-brand-700" : "text-slate-900")}>{badge}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Tabs nav */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                tab === key ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {/* ── EMPLOYEES TAB ── */}
        {tab === "employees" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card lg:col-span-2">
              <div className="card-header">
                <div className="card-title"><Users size={16} className="text-brand-600" />{ar ? "قائمة الموظفين" : "Employee List"}</div>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowAdd(true); setAddStep(1); setForm({ ...emptyForm }); setDocFiles({}); setError(""); }}>
                  <Plus size={14} />{ar ? "موظف جديد" : "Add"}
                </button>
              </div>
              <div className="table-wrapper">
                {employees.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا يوجد موظفون" : "No employees"}</div> : (
                  <table>
                    <thead><tr><th /><th>{ar ? "الرقم" : "ID"}</th><th>{ar ? "الاسم" : "Name"}</th><th>{ar ? "البريد" : "Email"}</th><th className="text-right">{ar ? "الراتب" : "Salary"}</th></tr></thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.employee_id} className={clsx("cursor-pointer", emp.employee_id === selectedId && "bg-brand-50")} onClick={() => setSelectedId(emp.employee_id)}>
                          <td className="pl-3" />
                          <td className="font-mono text-xs text-slate-500">{emp.employee_id}</td>
                          <td className="font-medium">{emp.name}</td>
                          <td className="max-w-[160px]"><div className="truncate text-sm text-slate-500">{emp.email || "-"}</div></td>
                          <td className="text-right font-mono text-sm">{formatCurrency(emp.base_salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Detail */}
            <div className="card compact">
              <div className="card-header">
                <div className="card-title">{ar ? "تفاصيل الموظف" : "Employee Details"}</div>
                {selectedEmployee && (
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-secondary" onClick={openEdit}><Edit2 size={13} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => setShowDel(true)}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
              {!selectedEmployee ? <div className="text-sm text-slate-400">{ar ? "اختر موظفاً" : "Select an employee"}</div> : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {selectedEmployee.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{selectedEmployee.name}</div>
                      <div className="text-xs font-mono text-slate-400">{selectedEmployee.employee_id}</div>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="flex items-start gap-3 py-2.5">
                      <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "البريد" : "Email"}</div><div className="text-sm break-all">{selectedEmployee.email || "-"}</div></div>
                    </div>
                    <div className="flex items-start gap-3 py-2.5">
                      <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "الهاتف" : "Phone"}</div><div className="text-sm">{selectedEmployee.phone || "-"}</div></div>
                    </div>
                    <div className="flex items-start gap-3 py-2.5">
                      <Hash size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "الراتب" : "Salary"}</div><div className="text-sm font-mono font-bold">{formatCurrency(selectedEmployee.base_salary)}</div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-2.5">
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "اسم القسم" : "Department"}</div>
                        <div className="text-sm font-medium text-slate-800">{selectedEmployee.department || "-"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "رقم القسم" : "Department Number"}</div>
                        <div className="text-sm font-medium text-slate-800">{selectedEmployee.department_number || "-"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "بداية العقد" : "Contract Start"}</div>
                        <div className="text-sm font-medium text-slate-800">{selectedEmployee.join_date ? String(selectedEmployee.join_date).substring(0, 10) : "-"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "نهاية العقد" : "Contract End"}</div>
                        <div className="text-sm font-medium text-slate-800">{selectedEmployee.contract_end_date ? String(selectedEmployee.contract_end_date).substring(0, 10) : "-"}</div>
                      </div>
                    </div>
                    <div className="py-2.5">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">{ar ? "الوثائق" : "Documents"}</div>
                      <div className="space-y-1">
                        {DOC_TYPES.map((dt) => {
                          const up = empDocs.find((d) => d.documentType === dt.key);
                          return (
                            <div key={dt.key} className="flex items-center gap-2">
                              {up ? <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" /> : <div className="w-3 h-3 rounded-full border-2 border-slate-200 flex-shrink-0" />}
                              <span className={clsx("text-xs", up ? "text-slate-700 font-medium" : "text-slate-400")}>{ar ? dt.ar : dt.en}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LEAVES TAB ── */}
        {tab === "leaves" && (
          <div className="card">
            <div className="card-header"><div className="card-title"><Calendar size={16} className="text-brand-600" />{ar ? "طلبات الإجازة" : "Leave Requests"}</div></div>
            {leaves.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا يوجد طلبات" : "No requests"}</div> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>{ar ? "الموظف" : "Employee"}</th><th>{ar ? "النوع" : "Type"}</th><th>{ar ? "من" : "From"}</th><th>{ar ? "إلى" : "To"}</th><th>{ar ? "الحالة" : "Status"}</th><th className="text-right">{ar ? "إجراء" : "Action"}</th></tr></thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.id}>
                        <td className="font-medium">{l.employee_name || l.employeeName || l.employee_id}</td>
                        <td className="text-slate-500 text-sm">{l.leave_type || l.leaveType}</td>
                        <td className="text-sm">{l.start_date ? new Date(l.start_date).toLocaleDateString() : "-"}</td>
                        <td className="text-sm">{l.end_date ? new Date(l.end_date).toLocaleDateString() : "-"}</td>
                        <td>
                          {l.status === "approved" && <span className="badge badge-green">{ar ? "موافق" : "Approved"}</span>}
                          {l.status === "rejected" && <span className="badge badge-red">{ar ? "مرفوض" : "Rejected"}</span>}
                          {l.status === "pending" && <span className="badge badge-yellow">{ar ? "معلق" : "Pending"}</span>}
                        </td>
                        <td>
                          {l.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <button className="btn btn-sm btn-success" disabled={leaveBusy === l.id} onClick={() => handleLeave(l.id, "approved")}>{ar ? "موافقة" : "Approve"}</button>
                              <button className="btn btn-sm btn-danger" disabled={leaveBusy === l.id} onClick={() => handleLeave(l.id, "rejected")}>{ar ? "رفض" : "Reject"}</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TASKS TAB ── */}
        {tab === "tasks" && (
          <div className="card">
            <div className="card-header"><div className="card-title"><CheckSquare size={16} className="text-brand-600" />{ar ? "المهام" : "Tasks"}</div></div>
            {tasks.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا يوجد مهام" : "No tasks"}</div> : (
              <div className="space-y-2 p-2">
                {tasks.map((task) => (
                  <div key={task.id} className={clsx("flex items-start gap-3 p-3 rounded-xl border", task.status === "completed" ? "bg-slate-50 border-slate-100" : "bg-white border-slate-200")}>
                    <button onClick={() => toggleTask(task)} disabled={taskBusy === task.id} className="mt-0.5 flex-shrink-0">
                      {task.status === "completed"
                        ? <CheckCircle size={18} className="text-emerald-500" />
                        : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={clsx("text-sm font-medium", task.status === "completed" ? "line-through text-slate-400" : "text-slate-900")}>{task.title}</div>
                      {task.description && <div className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</div>}
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">{task.due_date ? new Date(task.due_date).toLocaleDateString() : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {tab === "announcements" && (
          <div className="card">
            <div className="card-header"><div className="card-title"><Bell size={16} className="text-brand-600" />{ar ? "الإعلانات" : "Announcements"}</div></div>
            {announcements.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا يوجد إعلانات" : "No announcements"}</div> : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="font-semibold text-slate-900 mb-1">{ann.title}</div>
                    <div className="text-sm text-slate-600">{ann.message}</div>
                    <div className="text-xs text-slate-400 mt-2">{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : "-"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Employee Modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setAddStep(1); } }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{ar ? "إضافة موظف" : "Add Employee"}</h3>
              <button className="modal-close" onClick={() => { setShowAdd(false); setAddStep(1); }}><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 pb-4">
              <div className={clsx("flex items-center gap-1.5 text-sm font-semibold", addStep === 1 ? "text-brand-600" : "text-emerald-600")}>
                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", addStep === 1 ? "bg-brand-600 text-white" : "bg-emerald-100 text-emerald-600")}>{addStep > 1 ? <CheckCircle size={14} /> : "1"}</div>
                {ar ? "المعلومات" : "Info"}
              </div>
              <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
              <div className={clsx("flex items-center gap-1.5 text-sm font-semibold", addStep === 2 ? "text-brand-600" : "text-slate-400")}>
                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", addStep === 2 ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400")}>2</div>
                {ar ? "الوثائق" : "Documents"}
              </div>
            </div>

            {addStep === 1 && (
              <form onSubmit={handleAddStep1} className="space-y-4">
                <div><label className="form-label">{ar ? "الرقم الوظيفي" : "Employee ID"} *</label><input className="form-input" value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} placeholder="EMP-001" /></div>
                <div><label className="form-label">{ar ? "الاسم" : "Name"} *</label><input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="form-label">{ar ? "البريد الإلكتروني" : "Email"} *</label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="form-label">{ar ? "الهاتف" : "Phone"}</label><PhoneInput value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} /></div>
                <div><label className="form-label">{ar ? "الراتب الأساسي" : "Base Salary"} *</label><input type="number" className="form-input" value={form.base_salary} onChange={(e) => setForm((f) => ({ ...f, base_salary: e.target.value }))} /></div>
                <div><label className="form-label">{ar ? "اسم القسم" : "Department Name"}</label><input className="form-input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder={ar ? "مثال: المبيعات" : "e.g. Sales"} /></div>
                <div><label className="form-label">{ar ? "رقم القسم" : "Department Number"}</label><input className="form-input" value={form.department_number} onChange={(e) => setForm((f) => ({ ...f, department_number: e.target.value }))} placeholder="DEP-001" /></div>
                <div><label className="form-label">{ar ? "بداية العقد" : "Contract Start"}</label><input type="date" className="form-input" value={form.join_date} onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))} /></div>
                <div><label className="form-label">{ar ? "نهاية العقد" : "Contract End"}</label><input type="date" className="form-input" value={form.contract_end_date} onChange={(e) => setForm((f) => ({ ...f, contract_end_date: e.target.value }))} /></div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{ar ? "إلغاء" : "Cancel"}</button>
                  <button type="submit" className="btn btn-primary">{ar ? "التالي" : "Next"} <ChevronRight size={15} /></button>
                </div>
              </form>
            )}

            {addStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">{ar ? "ارفع الوثائق المطلوبة (PDF أو Word)" : "Upload required documents (PDF or Word)"}</p>
                <div className="space-y-3">
                  {DOC_TYPES.map((dt) => {
                    const file = docFiles[dt.key];
                    return (
                      <div key={dt.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", file ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400")}>
                          {file ? <CheckCircle size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700">{ar ? dt.ar : dt.en}</div>
                          {file && <div className="text-xs text-slate-400 truncate">{file.name}</div>}
                        </div>
                        <label className="btn btn-sm btn-secondary cursor-pointer flex-shrink-0">
                          <Upload size={13} />{ar ? "رفع" : "Upload"}
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setDocFiles((p) => ({ ...p, [dt.key]: e.target.files?.[0] || null }))} />
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between gap-2 pt-2">
                  <button className="btn btn-secondary" onClick={() => setAddStep(1)} disabled={docUploading}>{ar ? "رجوع" : "Back"}</button>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={handleUploadDocs} disabled={docUploading}>{ar ? "تخطي" : "Skip"}</button>
                    <button className="btn btn-primary" onClick={handleUploadDocs} disabled={docUploading || Object.keys(docFiles).filter(k => docFiles[k]).length === 0}>
                      {docUploading ? <span className="spinner" /> : <CheckCircle2 size={15} />}{ar ? "حفظ" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{ar ? "تعديل الموظف" : "Edit Employee"}</h3><button className="modal-close" onClick={() => setShowEdit(false)}><X size={18} /></button></div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div><label className="form-label">{ar ? "الرقم الوظيفي" : "Employee ID"} *</label><input className="form-input" value={editForm.employee_id} onChange={(e) => setEditForm((f) => ({ ...f, employee_id: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "الاسم" : "Name"} *</label><input className="form-input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "البريد" : "Email"} *</label><input type="email" className="form-input" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "الهاتف" : "Phone"}</label><PhoneInput value={editForm.phone} onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))} /></div>
              <div><label className="form-label">{ar ? "الراتب الأساسي" : "Base Salary"} *</label><input type="number" className="form-input" value={editForm.base_salary} onChange={(e) => setEditForm((f) => ({ ...f, base_salary: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "اسم القسم" : "Department Name"}</label><input className="form-input" value={editForm.department} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} placeholder={ar ? "مثال: المبيعات" : "e.g. Sales"} /></div>
              <div><label className="form-label">{ar ? "رقم القسم" : "Department Number"}</label><input className="form-input" value={editForm.department_number} onChange={(e) => setEditForm((f) => ({ ...f, department_number: e.target.value }))} placeholder="DEP-001" /></div>
              <div><label className="form-label">{ar ? "بداية العقد" : "Contract Start"}</label><input type="date" className="form-input" value={editForm.join_date} onChange={(e) => setEditForm((f) => ({ ...f, join_date: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "نهاية العقد" : "Contract End"}</label><input type="date" className="form-input" value={editForm.contract_end_date} onChange={(e) => setEditForm((f) => ({ ...f, contract_end_date: e.target.value }))} /></div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>{ar ? "إلغاء" : "Cancel"}</button><button type="submit" className="btn btn-primary" disabled={savingEdit}>{savingEdit ? <span className="spinner" /> : null}{ar ? "حفظ" : "Save"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwdModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPwdModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{ar ? "تغيير كلمة السر" : "Change Password"}</h3>
              <button className="modal-close" onClick={() => setShowPwdModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="form-label">{ar ? "كلمة السر الحالية" : "Current Password"}</label>
                <div className="relative">
                  <input type={pwdVisible.current ? "text" : "password"} required className={clsx("form-input", isRTL ? "pl-11" : "pr-11")} value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} dir="ltr" />
                  <button type="button" aria-label={pwdVisible.current ? "Hide password" : "Show password"} onClick={() => setPwdVisible((v) => ({ ...v, current: !v.current }))} className={clsx("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700", isRTL ? "left-3" : "right-3")}>
                    {pwdVisible.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">{ar ? "كلمة السر الجديدة" : "New Password"}</label>
                <div className="relative">
                  <input type={pwdVisible.next ? "text" : "password"} required className={clsx("form-input", isRTL ? "pl-11" : "pr-11")} value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} dir="ltr" />
                  <button type="button" aria-label={pwdVisible.next ? "Hide password" : "Show password"} onClick={() => setPwdVisible((v) => ({ ...v, next: !v.next }))} className={clsx("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700", isRTL ? "left-3" : "right-3")}>
                    {pwdVisible.next ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">{ar ? "تأكيد كلمة السر الجديدة" : "Confirm New Password"}</label>
                <div className="relative">
                  <input type={pwdVisible.confirm ? "text" : "password"} required className={clsx("form-input", isRTL ? "pl-11" : "pr-11")} value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} dir="ltr" />
                  <button type="button" aria-label={pwdVisible.confirm ? "Hide password" : "Show password"} onClick={() => setPwdVisible((v) => ({ ...v, confirm: !v.confirm }))} className={clsx("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700", isRTL ? "left-3" : "right-3")}>
                    {pwdVisible.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {pwdError && <div className="text-rose-600 text-sm bg-rose-50 rounded-lg px-3 py-2">{pwdError}</div>}
              {pwdSuccess && <div className="text-emerald-700 text-sm bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 size={14} />{pwdSuccess}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPwdModal(false)}>{ar ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
                  {pwdSaving ? <span className="spinner" /> : <KeyRound size={14} />}
                  {ar ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete */}
      {showDel && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{ar ? "تأكيد الحذف" : "Confirm Delete"}</h3>
            <p className="text-sm text-slate-500">{ar ? `هل تريد حذف ${selectedEmployee.name}؟` : `Delete ${selectedEmployee.name}?`}</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setShowDel(false)} disabled={deleting}>{ar ? "لا" : "Cancel"}</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? <span className="spinner" /> : <Trash2 size={14} />}{ar ? "حذف" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
