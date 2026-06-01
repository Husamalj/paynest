"use client";

import { useEffect, useState } from "react";
import {
  Users, Bell, CheckSquare, Calendar, LogOut, X,
  Plus, AlertTriangle, CheckCircle2, ChevronDown, ShieldCheck,
  Edit2, Trash2, Phone, Mail, Hash, FileText, CheckCircle,
  Upload, ChevronRight, Languages, Eye, EyeOff,
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
  { key: "certificate", ar: "شهادة / مؤهل",  en: "Certificate / Degree" },
  { key: "transcript",  ar: "كشف العلامات",   en: "Academic Transcript" },
  { key: "no_criminal", ar: "عدم المحكومية",  en: "No Criminal Record" },
  { key: "health",      ar: "خلو من الأمراض", en: "Health Certificate" },
];

function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const dialMatch = COUNTRIES.find((c) => value.startsWith(c.dial));
  const [dialCode, setDialCode] = useState(dialMatch?.dial ?? "+962");
  const [local, setLocal]       = useState(dialMatch ? value.slice(dialMatch.dial.length) : value);
  const handleDial  = (d: string) => { setDialCode(d); onChange(d + local); };
  const handleLocal = (v: string) => { setLocal(v);    onChange(dialCode + v); };
  return (
    <div className="flex gap-2">
      <select className="form-input w-28 flex-shrink-0" value={dialCode} onChange={(e) => handleDial(e.target.value)}>
        {COUNTRIES.map((c) => <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>)}
      </select>
      <input type="tel" className="form-input flex-1" placeholder="7XXXXXXXX" value={local} onChange={(e) => handleLocal(e.target.value)} />
    </div>
  );
}

const TABS = ["employees", "leaves", "tasks", "announcements", "hr_team"] as const;
type Tab = typeof TABS[number];

const emptyEmp  = { employee_id: "", name: "", email: "", phone: "", base_salary: "", social_security: false, religion: "" };
const emptyHR   = { name: "", email: "", password: "", phone: "", base_salary: "" };

export default function OwnerPortalPage() {
  const { lang, toggleLanguage, isRTL } = useLanguage();
  const ar = lang === "ar";

  const [user] = useState(() => typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {});
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("employees");

  /* ─── data ─── */
  const [employees,     setEmployees]     = useState<any[]>([]);
  const [leaves,        setLeaves]        = useState<any[]>([]);
  const [tasks,         setTasks]         = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [hrs,           setHrs]           = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  /* ─── employee detail / add / edit ─── */
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [lightbox, setLightbox] = useState("");
  const [empDocs,        setEmpDocs]       = useState<any[]>([]);
  const [showAddEmp,  setShowAddEmp]  = useState(false);
  const [addEmpStep,  setAddEmpStep]  = useState(1);
  const [empForm,     setEmpForm]     = useState({ ...emptyEmp });
  const [createdEmpId, setCreatedEmpId] = useState("");
  const [docFiles,    setDocFiles]    = useState<Record<string, File | null>>({});
  const [docUploading, setDocUploading] = useState(false);
  const [showEditEmp, setShowEditEmp] = useState(false);
  const [editEmpForm, setEditEmpForm] = useState({ ...emptyEmp });
  const [savingEmp,   setSavingEmp]   = useState(false);
  const [showDelEmp,  setShowDelEmp]  = useState(false);
  const [deletingEmp, setDeletingEmp] = useState(false);

  /* ─── HR management ─── */
  const [selectedHrId,  setSelectedHrId]  = useState<number | null>(null);
  const [showAddHR,     setShowAddHR]     = useState(false);
  const [hrForm,        setHrForm]        = useState({ ...emptyHR });
  const [showHrPwd,     setShowHrPwd]     = useState(false);
  const [addingHR,      setAddingHR]      = useState(false);
  const [showDelHR,     setShowDelHR]     = useState(false);
  const [deletingHR,    setDeletingHR]    = useState(false);
  const [showEditHR,    setShowEditHR]    = useState(false);
  const [editHRForm,    setEditHRForm]    = useState({ name: "", email: "", phone: "", base_salary: "" });
  const [savingHR,      setSavingHR]      = useState(false);

  /* ─── leave / task ─── */
  const [leaveBusy, setLeaveBusy] = useState<number | null>(null);
  const [taskBusy,  setTaskBusy]  = useState<number | null>(null);

  /* ─── load ─── */
  const load = async () => {
    setLoading(true);
    try {
      const [empRes, leavesRes, tasksRes, annRes, hrsRes] = await Promise.all([
        api.get("/employees"),
        api.get("/leaves"),
        api.get("/tasks"),
        api.get("/announcements"),
        api.get("/auth/company-hrs"),
      ]);
      const list = empRes.data || [];
      setEmployees(list);
      setLeaves(leavesRes.data || []);
      setTasks(tasksRes.data || []);
      setAnnouncements(annRes.data || []);
      const hrList = hrsRes.data || [];
      setHrs(hrList);
      if (!selectedEmpId && list.length) setSelectedEmpId(list[0].employee_id);
      if (!selectedHrId && hrList.length) setSelectedHrId(hrList[0].id);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadDocs = async (id: string) => {
    try { const r = await api.get(`/employees/${id}/documents`); setEmpDocs(r.data || []); } catch { setEmpDocs([]); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedEmpId) loadDocs(selectedEmpId); }, [selectedEmpId]);

  const signOut = () => {
    ["token", "paynest_logged_in", "role", "user", "paynest_employee_id"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/";
  };

  const selectedEmp = employees.find((e) => e.employee_id === selectedEmpId) || null;
  const selectedHR  = hrs.find((h) => h.id === selectedHrId) || null;

  /* ─── employee add step 1 ─── */
  const handleAddEmpStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.employee_id || !empForm.name || !empForm.email || !empForm.base_salary) {
      setError(ar ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields"); return;
    }
    try {
      await api.post("/employees", { ...empForm, base_salary: parseFloat(empForm.base_salary) });
      setCreatedEmpId(empForm.employee_id); setAddEmpStep(2); setError("");
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
    setShowAddEmp(false); setAddEmpStep(1); setEmpForm({ ...emptyEmp }); setDocFiles({});
    await load(); setSelectedEmpId(createdEmpId);
  };

  /* ─── employee edit ─── */
  const openEditEmp = () => {
    if (!selectedEmp) return;
    setEditEmpForm({ employee_id: selectedEmp.employee_id || "", name: selectedEmp.name || "", email: selectedEmp.email || "", phone: selectedEmp.phone || "", base_salary: selectedEmp.base_salary || "", social_security: !!selectedEmp.social_security, religion: selectedEmp.religion || "" });
    setShowEditEmp(true);
  };
  const handleEditEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setSavingEmp(true);
    try {
      const res = await api.put(`/employees/${selectedEmp.employee_id}`, { ...editEmpForm, base_salary: parseFloat(editEmpForm.base_salary) });
      setEmployees((p) => p.map((emp) => emp.employee_id === selectedEmp.employee_id ? res.data : emp));
      setSelectedEmpId(res.data.employee_id);
      setSuccess(ar ? "تم تعديل بيانات الموظف" : "Employee updated"); setShowEditEmp(false);
    } catch (e: any) { setError(e.message); }
    finally { setSavingEmp(false); }
  };
  const handleDeleteEmp = async () => {
    if (!selectedEmp) return;
    setDeletingEmp(true);
    try {
      await api.delete(`/employees/${selectedEmp.employee_id}`);
      const next = employees.filter((e) => e.employee_id !== selectedEmp.employee_id);
      setEmployees(next); setSelectedEmpId(next[0]?.employee_id || ""); setShowDelEmp(false);
      setSuccess(ar ? "تم حذف الموظف" : "Employee deleted");
    } catch (e: any) { setError(e.message); }
    finally { setDeletingEmp(false); }
  };

  /* ─── HR add / edit / delete ─── */
  const handleAddHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrForm.name || !hrForm.email) { setError(ar ? "الاسم والبريد مطلوبان" : "Name and email required"); return; }
    setAddingHR(true);
    try {
      await api.post("/auth/create-hr", { name: hrForm.name, email: hrForm.email, password: hrForm.password || "123456", phone: hrForm.phone, base_salary: parseFloat(hrForm.base_salary) || 0 });
      setSuccess(ar ? "تمت إضافة مدير HR" : "HR manager added");
      setShowAddHR(false); setHrForm({ ...emptyHR }); await load();
    } catch (e: any) { setError(e.message); }
    finally { setAddingHR(false); }
  };

  const openEditHR = () => {
    if (!selectedHR) return;
    setEditHRForm({ name: selectedHR.name || "", email: selectedHR.email || "", phone: selectedHR.phone || "", base_salary: String(selectedHR.base_salary ?? "") });
    setShowEditHR(true);
  };
  const handleEditHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHR) return;
    setSavingHR(true);
    try {
      const res = await api.put(`/auth/company-hrs/${selectedHR.id}`, editHRForm);
      setHrs((p) => p.map((h) => h.id === selectedHR.id ? { ...h, ...res.data } : h));
      setSuccess(ar ? "تم تعديل بيانات HR" : "HR manager updated"); setShowEditHR(false);
    } catch (e: any) { setError(e.message); }
    finally { setSavingHR(false); }
  };
  const handleDeleteHR = async () => {
    if (!selectedHR) return;
    setDeletingHR(true);
    try {
      await api.delete(`/auth/company-hrs/${selectedHR.id}`);
      const next = hrs.filter((h) => h.id !== selectedHR.id);
      setHrs(next); setSelectedHrId(next[0]?.id ?? null); setShowDelHR(false);
      setSuccess(ar ? "تم حذف مدير HR" : "HR manager removed");
    } catch (e: any) { setError(e.message); }
    finally { setDeletingHR(false); }
  };

  /* ─── leave / task ─── */
  const handleLeave = async (id: number, status: "approved" | "rejected") => {
    setLeaveBusy(id);
    try { await api.patch(`/leaves/${id}`, { status }); await load(); setSuccess(ar ? "تم تحديث الإجازة" : "Leave updated"); }
    catch (e: any) { setError(e.message); }
    finally { setLeaveBusy(null); }
  };
  const toggleTask = async (task: any) => {
    setTaskBusy(task.id);
    try {
      const newStatus = task.status === "completed" ? "pending" : "completed";
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      setTasks((p) => p.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (e: any) { setError(e.message); }
    finally { setTaskBusy(null); }
  };

  const pendingLeaves  = leaves.filter((l) => l.status === "pending").length;
  const openTasksCount = tasks.filter((t) => t.status !== "completed").length;

  const TAB_CONFIG = [
    { key: "employees",     label: ar ? "الموظفون"    : "Employees",     icon: Users,       badge: employees.length },
    { key: "hr_team",       label: ar ? "فريق HR"     : "HR Team",       icon: ShieldCheck, badge: hrs.length },
    { key: "leaves",        label: ar ? "الإجازات"    : "Leaves",        icon: Calendar,    badge: pendingLeaves },
    { key: "tasks",         label: ar ? "المهام"      : "Tasks",         icon: CheckSquare, badge: openTasksCount },
    { key: "announcements", label: ar ? "الإعلانات"   : "Announcements", icon: Bell,        badge: announcements.length },
  ] as const;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><span className="spinner spinner-dark w-6 h-6" /></div>;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-black text-xs">CO</div>
          <span className="font-bold text-slate-900 hidden sm:block">
            Pay<span className="text-violet-600">Nest</span>
            <span className="ml-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">{ar ? "بوابة المدير" : "Owner Portal"}</span>
          </span>
        </div>

        <div className="relative">
          <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {(user.name || "O")[0].toUpperCase()}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{user.name || "Owner"}</div>
              <div className="text-[11px] text-violet-600 uppercase font-bold">{ar ? "المدير" : "OWNER"}</div>
            </div>
            <ChevronDown size={14} className={clsx("text-slate-400 transition-transform flex-shrink-0", profileOpen && "rotate-180")} />
          </button>

          {profileOpen && (
            <div className={clsx("absolute top-full mt-2 w-56 bg-white rounded-xl shadow-elevated border border-slate-200 overflow-hidden z-50", isRTL ? "left-0" : "right-0")}>
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="font-semibold text-slate-900 truncate">{user.name || "Owner"}</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">{user.email || "-"}</div>
                <div className="mt-1.5 inline-flex px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold uppercase">{ar ? "المدير" : "OWNER"}</div>
              </div>
              <div className="p-2 space-y-0.5">
                <button onClick={() => { toggleLanguage(); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                  <Languages size={16} className="text-slate-400" />
                  <span>{lang === "en" ? "العربية" : "English"}</span>
                  <span className="ml-auto text-[11px] font-bold text-slate-400 uppercase">{lang === "en" ? "AR" : "EN"}</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-600 hover:bg-rose-50">
                  <LogOut size={16} />{ar ? "تسجيل خروج" : "Sign Out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error   && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
        {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")}><X size={14} /></button></div>}

        {/* Stat cards / tab switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {TAB_CONFIG.map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={clsx("card p-4 flex items-center gap-3 text-left transition-all", tab === key ? "ring-2 ring-violet-500 bg-violet-50" : "hover:shadow-elevated")}>
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", tab === key ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500")}>
                <Icon size={18} />
              </div>
              <div>
                <div className={clsx("text-xl font-bold", tab === key ? "text-violet-700" : "text-slate-900")}>{badge}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit flex-wrap">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                tab === key ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {/* ══ EMPLOYEES TAB ══ */}
        {tab === "employees" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card lg:col-span-2">
              <div className="card-header">
                <div className="card-title"><Users size={16} className="text-violet-600" />{ar ? "قائمة الموظفين" : "Employees"}</div>
                <button className="btn btn-primary btn-sm" style={{ background: "#7c3aed" }} onClick={() => { setShowAddEmp(true); setAddEmpStep(1); setEmpForm({ ...emptyEmp }); setDocFiles({}); setError(""); }}>
                  <Plus size={14} />{ar ? "موظف جديد" : "Add"}
                </button>
              </div>
              <div className="table-wrapper">
                {employees.length === 0
                  ? <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا يوجد موظفون" : "No employees"}</div>
                  : (
                    <table>
                      <thead><tr><th /><th>{ar ? "الرقم" : "ID"}</th><th>{ar ? "الاسم" : "Name"}</th><th>{ar ? "البريد" : "Email"}</th><th className="text-right">{ar ? "الراتب" : "Salary"}</th></tr></thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr key={emp.employee_id} className={clsx("cursor-pointer", emp.employee_id === selectedEmpId && "bg-violet-50")} onClick={() => setSelectedEmpId(emp.employee_id)}>
                            <td className="pl-3" />
                            <td className="font-mono text-xs text-slate-500">{emp.employee_id}</td>
                            <td className="font-medium">
                              <div className="flex items-center gap-2">
                                {emp.photo_url ? (
                                  <img src={emp.photo_url} alt={emp.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-bold flex-shrink-0">{emp.name?.[0]?.toUpperCase() || "?"}</div>
                                )}
                                <span className="truncate">{emp.name}</span>
                              </div>
                            </td>
                            <td><div className="truncate text-sm text-slate-500">{emp.email || "-"}</div></td>
                            <td className="text-right font-mono text-sm">{formatCurrency(emp.base_salary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>

            {/* Employee detail */}
            <div className="card compact">
              <div className="card-header">
                <div className="card-title">{ar ? "تفاصيل الموظف" : "Details"}</div>
                {selectedEmp && (
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-secondary" onClick={openEditEmp}><Edit2 size={13} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => setShowDelEmp(true)}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
              {!selectedEmp
                ? <div className="text-sm text-slate-400 text-center py-8">{ar ? "اختر موظفاً" : "Select an employee"}</div>
                : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {selectedEmp.photo_url ? (
                        <img src={selectedEmp.photo_url} alt={selectedEmp.name} onClick={() => setLightbox(selectedEmp.photo_url)} className="w-12 h-12 rounded-full object-cover cursor-pointer ring-2 ring-violet-100 flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                          {selectedEmp.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{selectedEmp.name}</div>
                        <div className="text-xs font-mono text-slate-400">{selectedEmp.employee_id}</div>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="flex items-start gap-3 py-2.5">
                        <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "البريد" : "Email"}</div><div className="text-sm break-all">{selectedEmp.email || "-"}</div></div>
                      </div>
                      <div className="flex items-start gap-3 py-2.5">
                        <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "الهاتف" : "Phone"}</div><div className="text-sm">{selectedEmp.phone || "-"}</div></div>
                      </div>
                      <div className="flex items-start gap-3 py-2.5">
                        <Hash size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "الراتب" : "Salary"}</div><div className="text-sm font-mono font-bold">{formatCurrency(selectedEmp.base_salary)}</div></div>
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

        {/* ══ HR TEAM TAB ══ */}
        {tab === "hr_team" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card lg:col-span-2">
              <div className="card-header">
                <div className="card-title"><ShieldCheck size={16} className="text-violet-600" />{ar ? "مديرو الموارد البشرية" : "HR Managers"}</div>
                <button className="btn btn-primary btn-sm" style={{ background: "#7c3aed" }} onClick={() => { setShowAddHR(true); setHrForm({ ...emptyHR }); setError(""); }}>
                  <Plus size={14} />{ar ? "إضافة HR" : "Add HR"}
                </button>
              </div>
              {hrs.length === 0
                ? (
                  <div className="text-center py-16 text-sm text-slate-400">
                    <ShieldCheck size={32} className="mx-auto mb-3 text-slate-200" />
                    {ar ? "لا يوجد مديرو HR بعد" : "No HR managers yet"}
                    <div className="mt-2"><button className="btn btn-primary btn-sm" style={{ background: "#7c3aed" }} onClick={() => { setShowAddHR(true); setHrForm({ ...emptyHR }); }}><Plus size={13} />{ar ? "إضافة الأول" : "Add first"}</button></div>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>{ar ? "الاسم" : "Name"}</th><th>{ar ? "البريد" : "Email"}</th><th>{ar ? "الهاتف" : "Phone"}</th><th className="text-right">{ar ? "الراتب" : "Salary"}</th></tr></thead>
                      <tbody>
                        {hrs.map((hr) => (
                          <tr key={hr.id} className={clsx("cursor-pointer", hr.id === selectedHrId && "bg-violet-50")} onClick={() => setSelectedHrId(hr.id)}>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">{hr.name?.[0]?.toUpperCase() || "H"}</div>
                                <span className="font-medium">{hr.name}</span>
                              </div>
                            </td>
                            <td><div className="text-sm text-slate-500 truncate max-w-[150px]">{hr.email || "—"}</div></td>
                            <td><div className="text-sm text-slate-500">{hr.phone || "—"}</div></td>
                            <td className="text-right font-mono text-sm">{formatCurrency(hr.base_salary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>

            {/* HR detail */}
            <div className="card compact">
              <div className="card-header">
                <div className="card-title">{ar ? "تفاصيل HR" : "HR Details"}</div>
                {selectedHR && (
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-secondary" onClick={openEditHR}><Edit2 size={13} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => setShowDelHR(true)}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
              {!selectedHR
                ? <div className="text-sm text-slate-400 text-center py-8">{ar ? "اختر مدير HR" : "Select an HR manager"}</div>
                : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-bold flex-shrink-0">{selectedHR.name?.[0]?.toUpperCase() || "H"}</div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{selectedHR.name}</div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold uppercase mt-0.5"><ShieldCheck size={10} />HR</span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="flex items-start gap-3 py-2.5"><Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" /><div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "البريد" : "Email"}</div><div className="text-sm break-all">{selectedHR.email || "—"}</div></div></div>
                      <div className="flex items-start gap-3 py-2.5"><Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" /><div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "الهاتف" : "Phone"}</div><div className="text-sm">{selectedHR.phone || "—"}</div></div></div>
                      <div className="flex items-start gap-3 py-2.5"><Hash size={14} className="text-slate-400 mt-0.5 flex-shrink-0" /><div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "رقم الموظف" : "Emp No."}</div><div className="text-sm font-mono">{selectedHR.employeeNumber || "—"}</div></div></div>
                      <div className="flex items-start gap-3 py-2.5"><Hash size={14} className="text-slate-400 mt-0.5 flex-shrink-0" /><div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "الراتب" : "Salary"}</div><div className="text-sm font-mono font-bold">{formatCurrency(selectedHR.base_salary)}</div></div></div>
                      <div className="flex items-start gap-3 py-2.5"><ShieldCheck size={14} className="text-slate-400 mt-0.5 flex-shrink-0" /><div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-slate-400 uppercase">{ar ? "كلمة السر" : "Password"}</div><div className="text-sm">{selectedHR.mustChangePassword ? <span className="badge badge-yellow">{ar ? "يجب التغيير" : "Must change"}</span> : <span className="badge badge-green">{ar ? "مُحدَّثة" : "Updated"}</span>}</div></div></div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ══ LEAVES TAB ══ */}
        {tab === "leaves" && (
          <div className="card">
            <div className="card-header"><div className="card-title"><Calendar size={16} className="text-violet-600" />{ar ? "طلبات الإجازة" : "Leave Requests"}</div></div>
            {leaves.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا يوجد طلبات" : "No requests"}</div> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>{ar ? "الموظف" : "Employee"}</th><th>{ar ? "النوع" : "Type"}</th><th>{ar ? "من" : "From"}</th><th>{ar ? "إلى" : "To"}</th><th>{ar ? "الحالة" : "Status"}</th><th className="text-right">{ar ? "إجراء" : "Action"}</th></tr></thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.id}>
                        <td className="font-medium">{l.employee_name || l.employee_id}</td>
                        <td className="text-slate-500 text-sm">{l.leave_type}</td>
                        <td className="text-sm">{l.start_date ? new Date(l.start_date).toLocaleDateString() : "-"}</td>
                        <td className="text-sm">{l.end_date ? new Date(l.end_date).toLocaleDateString() : "-"}</td>
                        <td>
                          {l.status === "approved" && <span className="badge badge-green">{ar ? "موافق" : "Approved"}</span>}
                          {l.status === "rejected" && <span className="badge badge-red">{ar ? "مرفوض" : "Rejected"}</span>}
                          {l.status === "pending"  && <span className="badge badge-yellow">{ar ? "معلق" : "Pending"}</span>}
                        </td>
                        <td>{l.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <button className="btn btn-sm btn-success" disabled={leaveBusy === l.id} onClick={() => handleLeave(l.id, "approved")}>{ar ? "موافقة" : "Approve"}</button>
                            <button className="btn btn-sm btn-danger"  disabled={leaveBusy === l.id} onClick={() => handleLeave(l.id, "rejected")}>{ar ? "رفض" : "Reject"}</button>
                          </div>
                        )}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ TASKS TAB ══ */}
        {tab === "tasks" && (
          <div className="card">
            <div className="card-header"><div className="card-title"><CheckSquare size={16} className="text-violet-600" />{ar ? "المهام" : "Tasks"}</div></div>
            {tasks.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا يوجد مهام" : "No tasks"}</div> : (
              <div className="space-y-2 p-2">
                {tasks.map((task) => (
                  <div key={task.id} className={clsx("flex items-start gap-3 p-3 rounded-xl border", task.status === "completed" ? "bg-slate-50 border-slate-100" : "bg-white border-slate-200")}>
                    <button onClick={() => toggleTask(task)} disabled={taskBusy === task.id} className="mt-0.5 flex-shrink-0">
                      {task.status === "completed" ? <CheckCircle size={18} className="text-emerald-500" /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={clsx("text-sm font-medium", task.status === "completed" ? "line-through text-slate-400" : "text-slate-900")}>{task.task_name || task.taskName}</div>
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">{task.deadline ? new Date(task.deadline).toLocaleDateString() : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ANNOUNCEMENTS TAB ══ */}
        {tab === "announcements" && (
          <div className="card">
            <div className="card-header"><div className="card-title"><Bell size={16} className="text-violet-600" />{ar ? "الإعلانات" : "Announcements"}</div></div>
            {announcements.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا يوجد إعلانات" : "No announcements"}</div> : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-violet-50 border border-violet-100 rounded-xl">
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

      {/* ══ ADD EMPLOYEE MODAL ══ */}
      {showAddEmp && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowAddEmp(false); setAddEmpStep(1); } }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{ar ? "إضافة موظف" : "Add Employee"}</h3>
              <button className="modal-close" onClick={() => { setShowAddEmp(false); setAddEmpStep(1); }}><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 pb-4">
              <div className={clsx("flex items-center gap-1.5 text-sm font-semibold", addEmpStep === 1 ? "text-violet-600" : "text-emerald-600")}>
                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", addEmpStep === 1 ? "bg-violet-600 text-white" : "bg-emerald-100 text-emerald-600")}>{addEmpStep > 1 ? <CheckCircle size={14} /> : "1"}</div>
                {ar ? "المعلومات" : "Info"}
              </div>
              <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
              <div className={clsx("flex items-center gap-1.5 text-sm font-semibold", addEmpStep === 2 ? "text-violet-600" : "text-slate-400")}>
                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", addEmpStep === 2 ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400")}>2</div>
                {ar ? "الوثائق" : "Documents"}
              </div>
            </div>
            {addEmpStep === 1 && (
              <form onSubmit={handleAddEmpStep1} className="space-y-4">
                <div><label className="form-label">{ar ? "الرقم الوظيفي" : "Employee ID"} *</label><input className="form-input" value={empForm.employee_id} onChange={(e) => setEmpForm((f) => ({ ...f, employee_id: e.target.value }))} placeholder="EMP-001" /></div>
                <div><label className="form-label">{ar ? "الاسم" : "Name"} *</label><input className="form-input" value={empForm.name} onChange={(e) => setEmpForm((f) => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="form-label">{ar ? "البريد" : "Email"} *</label><input type="email" className="form-input" value={empForm.email} onChange={(e) => setEmpForm((f) => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="form-label">{ar ? "الهاتف" : "Phone"}</label><PhoneInput value={empForm.phone} onChange={(v) => setEmpForm((f) => ({ ...f, phone: v }))} /></div>
                <div><label className="form-label">{ar ? "الراتب" : "Salary"} *</label><input type="number" className="form-input" value={empForm.base_salary} onChange={(e) => setEmpForm((f) => ({ ...f, base_salary: e.target.value }))} /></div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddEmp(false)}>{ar ? "إلغاء" : "Cancel"}</button>
                  <button type="submit" className="btn btn-primary" style={{ background: "#7c3aed" }}>{ar ? "التالي" : "Next"} <ChevronRight size={15} /></button>
                </div>
              </form>
            )}
            {addEmpStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">{ar ? "ارفع الوثائق المطلوبة (اختياري)" : "Upload required documents (optional)"}</p>
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
                  <button className="btn btn-secondary" onClick={() => setAddEmpStep(1)}>{ar ? "رجوع" : "Back"}</button>
                  <button className="btn btn-primary" style={{ background: "#7c3aed" }} disabled={docUploading} onClick={handleUploadDocs}>
                    {docUploading ? (ar ? "جاري الرفع..." : "Uploading...") : (ar ? "حفظ وإنهاء" : "Save & Finish")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ EDIT EMPLOYEE MODAL ══ */}
      {showEditEmp && selectedEmp && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEditEmp(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{ar ? "تعديل الموظف" : "Edit Employee"}</h3><button className="modal-close" onClick={() => setShowEditEmp(false)}><X size={18} /></button></div>
            <form onSubmit={handleEditEmp} className="space-y-4">
              <div><label className="form-label">{ar ? "الرقم الوظيفي" : "Employee ID"}</label><input className="form-input" value={editEmpForm.employee_id} onChange={(e) => setEditEmpForm((f) => ({ ...f, employee_id: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "الاسم" : "Name"}</label><input className="form-input" value={editEmpForm.name} onChange={(e) => setEditEmpForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "البريد" : "Email"}</label><input type="email" className="form-input" value={editEmpForm.email} onChange={(e) => setEditEmpForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "الهاتف" : "Phone"}</label><PhoneInput value={editEmpForm.phone} onChange={(v) => setEditEmpForm((f) => ({ ...f, phone: v }))} /></div>
              <div><label className="form-label">{ar ? "الراتب" : "Salary"}</label><input type="number" className="form-input" value={editEmpForm.base_salary} onChange={(e) => setEditEmpForm((f) => ({ ...f, base_salary: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowEditEmp(false)}>{ar ? "إلغاء" : "Cancel"}</button>
                <button type="submit" disabled={savingEmp} className="btn btn-primary flex-1" style={{ background: "#7c3aed" }}>{savingEmp ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE EMPLOYEE CONFIRM ══ */}
      {showDelEmp && selectedEmp && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDelEmp(false); }}>
          <div className="modal max-w-sm">
            <div className="modal-header"><h3 className="modal-title text-red-600">{ar ? "تأكيد الحذف" : "Confirm Delete"}</h3><button className="modal-close" onClick={() => setShowDelEmp(false)}><X size={18} /></button></div>
            <p className="text-sm text-slate-600 mb-6">{ar ? `هل أنت متأكد من حذف "${selectedEmp.name}"؟` : `Delete "${selectedEmp.name}"? This cannot be undone.`}</p>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setShowDelEmp(false)}>{ar ? "إلغاء" : "Cancel"}</button>
              <button className="btn btn-danger flex-1" disabled={deletingEmp} onClick={handleDeleteEmp}>{deletingEmp ? (ar ? "جاري الحذف..." : "Deleting...") : (ar ? "حذف" : "Delete")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD HR MODAL ══ */}
      {showAddHR && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddHR(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{ar ? "إضافة مدير HR" : "Add HR Manager"}</h3><button className="modal-close" onClick={() => setShowAddHR(false)}><X size={18} /></button></div>
            <form onSubmit={handleAddHR} className="space-y-4">
              <div><label className="form-label">{ar ? "الاسم الكامل" : "Full Name"} *</label><input type="text" className="form-input" value={hrForm.name} onChange={(e) => setHrForm((p) => ({ ...p, name: e.target.value }))} required /></div>
              <div><label className="form-label">{ar ? "البريد الإلكتروني" : "Email"} *</label><input type="email" className="form-input" dir="ltr" value={hrForm.email} onChange={(e) => setHrForm((p) => ({ ...p, email: e.target.value }))} required /></div>
              <div>
                <label className="form-label">{ar ? "كلمة السر المؤقتة" : "Temp Password"} <span className="text-slate-400 font-normal">({ar ? "افتراضي: 123456" : "default: 123456"})</span></label>
                <div className="relative">
                  <input type={showHrPwd ? "text" : "password"} className="form-input pr-10" dir="ltr" placeholder="123456" value={hrForm.password} onChange={(e) => setHrForm((p) => ({ ...p, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowHrPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showHrPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div><label className="form-label">{ar ? "الهاتف" : "Phone"}</label><PhoneInput value={hrForm.phone} onChange={(v) => setHrForm((p) => ({ ...p, phone: v }))} /></div>
              <div><label className="form-label">{ar ? "الراتب" : "Salary"}</label><input type="number" className="form-input" dir="ltr" placeholder="0.00" value={hrForm.base_salary} onChange={(e) => setHrForm((p) => ({ ...p, base_salary: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowAddHR(false)}>{ar ? "إلغاء" : "Cancel"}</button>
                <button type="submit" disabled={addingHR} className="btn btn-primary flex-1" style={{ background: "#7c3aed" }}>{addingHR ? (ar ? "جاري الإضافة..." : "Adding...") : (ar ? "إضافة" : "Add")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ EDIT HR MODAL ══ */}
      {showEditHR && selectedHR && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEditHR(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{ar ? "تعديل HR" : "Edit HR Manager"}</h3><button className="modal-close" onClick={() => setShowEditHR(false)}><X size={18} /></button></div>
            <form onSubmit={handleEditHR} className="space-y-4">
              <div><label className="form-label">{ar ? "الاسم" : "Name"}</label><input type="text" className="form-input" value={editHRForm.name} onChange={(e) => setEditHRForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "البريد" : "Email"}</label><input type="email" className="form-input" dir="ltr" value={editHRForm.email} onChange={(e) => setEditHRForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "الهاتف" : "Phone"}</label><PhoneInput value={editHRForm.phone} onChange={(v) => setEditHRForm((p) => ({ ...p, phone: v }))} /></div>
              <div><label className="form-label">{ar ? "الراتب" : "Salary"}</label><input type="number" className="form-input" dir="ltr" value={editHRForm.base_salary} onChange={(e) => setEditHRForm((p) => ({ ...p, base_salary: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowEditHR(false)}>{ar ? "إلغاء" : "Cancel"}</button>
                <button type="submit" disabled={savingHR} className="btn btn-primary flex-1" style={{ background: "#7c3aed" }}>{savingHR ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE HR CONFIRM ══ */}
      {showDelHR && selectedHR && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDelHR(false); }}>
          <div className="modal max-w-sm">
            <div className="modal-header"><h3 className="modal-title text-red-600">{ar ? "تأكيد الحذف" : "Confirm Delete"}</h3><button className="modal-close" onClick={() => setShowDelHR(false)}><X size={18} /></button></div>
            <p className="text-sm text-slate-600 mb-6">{ar ? `هل أنت متأكد من حذف "${selectedHR.name}"؟` : `Remove "${selectedHR.name}"? This cannot be undone.`}</p>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setShowDelHR(false)}>{ar ? "إلغاء" : "Cancel"}</button>
              <button className="btn btn-danger flex-1" disabled={deletingHR} onClick={handleDeleteHR}>{deletingHR ? (ar ? "جاري الحذف..." : "Deleting...") : (ar ? "حذف" : "Delete")}</button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6" onClick={() => setLightbox("")}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
