"use client";

import { useEffect, useState } from "react";
import {
  Building2, Plus, X, CheckCircle2, AlertTriangle, Edit3,
  Trash2, LogOut, Power, Clock, Users, Ban, RefreshCw,
  Mail, EyeOff, CreditCard, Languages,
} from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";
import { HIDDEN_PAGE_OPTIONS } from "@/lib/pageRegistry";
import ModalShell from "@/components/ModalShell";
import ConfirmButton from "@/components/ConfirmButton";
import { readHiddenPages } from "@/lib/responseShape";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function safeErr(e: any) {
  if (!e) return "Error";
  if (typeof e === "string") return e;
  if (typeof e.message === "string") return e.message;
  return String(e);
}

type Tab = "pending" | "active" | "suspended" | "all";

const labels = {
  en: {
    dashboard: "CEO Dashboard",
    addCompany: "Add Company",
    signOut: "Sign out",
    totalCompanies: "Total Companies",
    pendingApproval: "Pending Approval",
    active: "Active",
    suspended: "Suspended",
    all: "All",
    pending: "Pending",
    company: "Company",
    ownerEmail: "Owner Email",
    slug: "Slug",
    employees: "Employees",
    max: "Max",
    plan: "Plan",
    status: "Status",
    registered: "Registered",
    actions: "Actions",
    demoRequests: "Demo Requests",
    unread: "unread",
    refresh: "Refresh",
    noDemoRequests: "No demo requests yet",
    new: "New",
    delete: "Delete",
    limit: "Limit",
    pages: "Pages",
    billing: "Billing",
    approve: "Approve",
    reject: "Reject",
    suspend: "Suspend",
    reactivate: "Reactivate",
    noPendingCompanies: "No pending companies",
    noCompanies: "No companies in this category",
    addOwner: "Add owner",
    additionalOwners: "Additional Owners (optional)",
    additionalOwnersHint: "You can add more than one owner to this company.",
    companyName: "Company Name",
    ownerName: "Owner Name",
    temporaryPassword: "Temporary Password",
    maxEmployees: "Max Employees",
    maxEmployeesHint: "Set the maximum number of employees this company can have. Leave empty for unlimited.",
    cancel: "Cancel",
    createCompany: "Create Company",
    editEmployeeLimit: "Edit Employee Limit",
    currentEmployees: "Current employees",
    currentLimit: "Current limit",
    newMaxEmployees: "New Max Employees",
    unlimited: "Unlimited",
    saveLimit: "Save Limit",
    hidePages: "Hide Pages",
    hidePagesHint: "Checked pages will be hidden for this company only.",
    savePages: "Save Pages",
    billingTitle: "Billing & Subscription",
    trialEnds: "Trial Ends",
    subscriptionEnds: "Subscription Ends",
    billingEmail: "Billing Email",
    billingNotes: "Billing Notes",
    billingNotesPlaceholder: "Contract terms, payment notes, invoice reference...",
    saveBilling: "Save Billing",
    billingWarning: "Past due, suspended, cancelled, or expired trial/subscription statuses block non-super-admin login.",
    language: "العربية",
    companyCreated: "Company created and activated",
    companyDeleted: "Company deleted",
    deleteRequestPrompt: "Delete this request?",
    deleteCompanyPrompt: (name: string) => `Delete "${name}"? This is permanent.`,
    approved: (name: string) => `"${name}" approved`,
    rejected: (name: string) => `"${name}" rejected`,
    suspendedMsg: (name: string) => `"${name}" suspended`,
    reactivated: (name: string) => `"${name}" reactivated`,
    maxSet: (name: string, value: string) => `Max employees for "${name}" set to ${value}`,
    hiddenPagesUpdated: (name: string) => `Hidden pages updated for "${name}"`,
    billingUpdated: (name: string) => `Billing updated for "${name}"`,
  },
  ar: {
    dashboard: "لوحة المدير العام",
    addCompany: "إضافة شركة",
    signOut: "تسجيل الخروج",
    totalCompanies: "إجمالي الشركات",
    pendingApproval: "بانتظار الموافقة",
    active: "نشطة",
    suspended: "موقوفة",
    all: "الكل",
    pending: "معلّقة",
    company: "الشركة",
    ownerEmail: "إيميل المالك",
    slug: "الرابط",
    employees: "الموظفون",
    max: "الحد",
    plan: "الخطة",
    status: "الحالة",
    registered: "التسجيل",
    actions: "الإجراءات",
    demoRequests: "طلبات التواصل",
    unread: "غير مقروء",
    refresh: "تحديث",
    noDemoRequests: "لا توجد طلبات تواصل بعد",
    new: "جديد",
    delete: "حذف",
    limit: "الحد",
    pages: "الصفحات",
    billing: "الفوترة",
    approve: "موافقة",
    reject: "رفض",
    suspend: "إيقاف",
    reactivate: "إعادة تفعيل",
    noPendingCompanies: "لا توجد شركات معلّقة",
    noCompanies: "لا توجد شركات في هذا التصنيف",
    addOwner: "إضافة مالك",
    additionalOwners: "مالكون إضافيون (اختياري)",
    additionalOwnersHint: "يمكنك إضافة أكثر من مالك لهذه الشركة.",
    companyName: "اسم الشركة",
    ownerName: "اسم المالك",
    temporaryPassword: "كلمة مرور مؤقتة",
    maxEmployees: "الحد الأعلى للموظفين",
    maxEmployeesHint: "حدد الحد الأعلى لعدد الموظفين. اتركه فارغًا لعدد غير محدود.",
    cancel: "إلغاء",
    createCompany: "إنشاء الشركة",
    editEmployeeLimit: "تعديل حد الموظفين",
    currentEmployees: "عدد الموظفين الحالي",
    currentLimit: "الحد الحالي",
    newMaxEmployees: "الحد الجديد للموظفين",
    unlimited: "غير محدود",
    saveLimit: "حفظ الحد",
    hidePages: "إخفاء الصفحات",
    hidePagesHint: "الصفحات المحددة سيتم إخفاؤها لهذه الشركة فقط.",
    savePages: "حفظ الصفحات",
    billingTitle: "الفوترة والاشتراك",
    trialEnds: "نهاية التجربة",
    subscriptionEnds: "نهاية الاشتراك",
    billingEmail: "إيميل الفوترة",
    billingNotes: "ملاحظات الفوترة",
    billingNotesPlaceholder: "شروط العقد، ملاحظات الدفع، رقم الفاتورة...",
    saveBilling: "حفظ الفوترة",
    billingWarning: "حالات الدفع المتأخر أو الإيقاف أو الإلغاء أو انتهاء التجربة/الاشتراك تمنع دخول غير السوبر أدمن.",
    language: "English",
    companyCreated: "تم إنشاء الشركة وتفعيلها",
    companyDeleted: "تم حذف الشركة",
    deleteRequestPrompt: "حذف هذا الطلب؟",
    deleteCompanyPrompt: (name: string) => `حذف "${name}"؟ هذا الإجراء نهائي.`,
    approved: (name: string) => `تمت الموافقة على "${name}"`,
    rejected: (name: string) => `تم رفض "${name}"`,
    suspendedMsg: (name: string) => `تم إيقاف "${name}"`,
    reactivated: (name: string) => `تمت إعادة تفعيل "${name}"`,
    maxSet: (name: string, value: string) => `تم ضبط حد موظفي "${name}" إلى ${value}`,
    hiddenPagesUpdated: (name: string) => `تم تحديث الصفحات المخفية لـ "${name}"`,
    billingUpdated: (name: string) => `تم تحديث الفوترة لـ "${name}"`,
  },
} as const;

export default function SuperAdminPage() {
  const { isRTL, lang, toggleLanguage } = useLanguage();
  const text = labels[lang];
  const [companies, setCompanies] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState({ companyName: "", slug: "", ownerName: "", email: "", password: "123456", maxEmployees: "" });
  const [extraOwners, setExtraOwners] = useState<{ name: string; email: string }[]>([]);
  const [editMax, setEditMax] = useState<{ company: any; value: string } | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [pageEdit, setPageEdit] = useState<{ company: any; hidden: string[] } | null>(null);
  const [billingEdit, setBillingEdit] = useState<{
    company: any;
    subscriptionPlan: string;
    subscriptionStatus: string;
    trialEndsAt: string;
    subscriptionEndsAt: string;
    billingEmail: string;
    billingNotes: string;
  } | null>(null);

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

  const loadRequests = async () => {
    try { const res = await api.get("/contact"); setRequests(res.data?.requests || []); } catch {}
  };
  const markRead = async (r: any) => {
    if (r.read) return;
    setRequests((p) => p.map((x) => (x.id === r.id ? { ...x, read: true } : x)));
    try { await api.patch(`/contact/${r.id}`, { read: true }); } catch {}
  };
  const deleteLead = async (id: number) => {
    setRequests((p) => p.filter((x) => x.id !== id));
    try { await api.delete(`/contact/${id}`); } catch {}
  };

  useEffect(() => { load(); loadRequests(); }, []);

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
      const createRes = await api.post("/auth/register-company", { ...form, additionalOwners: extraOwners.filter((o) => o.email.trim()) });
      if (createRes.data.pending) {
        const allRes = await api.get("/companies");
        const created = (allRes.data || []).find((c: any) => c.slug === form.slug);
        if (created) await api.patch(`/companies/${created.id}/approve`);
      }
      setSuccess(text.companyCreated);
      setShowAdd(false);
      setForm({ companyName: "", slug: "", ownerName: "", email: "", password: "123456", maxEmployees: "" });
      setExtraOwners([]);
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
      const newVal = editMax.value === "" ? text.unlimited : editMax.value;
      setSuccess(text.maxSet(editMax.company.name, newVal));
      setEditMax(null);
      await load();
    } catch (e: any) { setError(safeErr(e)); }
    finally { setBusyId(null); }
  };

  const saveHiddenPages = async () => {
    if (!pageEdit) return;
    setBusyId(pageEdit.company.id); setError(""); setSuccess("");
    try {
      await api.patch(`/companies/${pageEdit.company.id}`, { hiddenPages: pageEdit.hidden });
      setSuccess(text.hiddenPagesUpdated(pageEdit.company.name));
      setPageEdit(null);
      await load();
    } catch (e: any) { setError(safeErr(e)); }
    finally { setBusyId(null); }
  };

  const saveBilling = async () => {
    if (!billingEdit) return;
    setBusyId(billingEdit.company.id); setError(""); setSuccess("");
    try {
      await api.patch(`/companies/${billingEdit.company.id}`, {
        subscriptionPlan: billingEdit.subscriptionPlan,
        subscriptionStatus: billingEdit.subscriptionStatus,
        trialEndsAt: billingEdit.trialEndsAt || null,
        subscriptionEndsAt: billingEdit.subscriptionEndsAt || null,
        billingEmail: billingEdit.billingEmail || null,
        billingNotes: billingEdit.billingNotes || null,
      });
      setSuccess(text.billingUpdated(billingEdit.company.name));
      setBillingEdit(null);
      await load();
    } catch (e: any) { setError(safeErr(e)); }
    finally { setBusyId(null); }
  };

  const handleDelete = async (company: any) => {
    setBusyId(company.id); setError(""); setSuccess("");
    try {
      await api.delete(`/companies/${company.id}`);
      setSuccess(text.companyDeleted);
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

  const toDateInput = (value: any) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  };

  const planLabel = (plan: any) => {
    const value = String(plan || "manual");
    if (!isRTL) return value;
    return ({
      manual: "يدوي",
      starter: "Starter",
      growth: "Growth",
      scale: "Scale",
      enterprise: "Enterprise",
    } as Record<string, string>)[value] || value;
  };

  const subscriptionStatusLabel = (status: any) => {
    const value = String(status || "active");
    if (!isRTL) return value.replace("_", " ");
    return ({
      trialing: "تجربة",
      active: "نشط",
      past_due: "دفع متأخر",
      suspended: "موقوف",
      cancelled: "ملغي",
    } as Record<string, string>)[value] || value;
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900">
            Pay<span className="text-blue-600">Nest</span>
            <span className="ms-2 text-sm font-semibold text-slate-400 tracking-widest uppercase">{text.dashboard}</span>
          </h1>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => toggleLanguage()}
              title={isRTL ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Languages size={16} /> {text.language}
            </button>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> {text.addCompany}</button>
            <button className="btn btn-secondary" onClick={signOut}><LogOut size={16} /> {text.signOut}</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: text.totalCompanies, value: stats.total, Icon: Building2, color: "text-brand-600 bg-brand-50" },
            { label: text.pendingApproval, value: stats.pending, Icon: Clock, color: "text-amber-600 bg-amber-50" },
            { label: text.active, value: stats.active, Icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
            { label: text.suspended, value: stats.suspended, Icon: Ban, color: "text-rose-600 bg-rose-50" },
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
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-brand-600" />
              <h2 className="font-bold text-slate-900">{text.demoRequests}</h2>
              {requests.some((r) => !r.read) && (
                <span className="badge badge-yellow">{requests.filter((r) => !r.read).length} {text.unread}</span>
              )}
            </div>
            <button className="btn btn-sm btn-secondary" onClick={loadRequests}><RefreshCw size={13} /> {text.refresh}</button>
          </div>
          {requests.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400">{text.noDemoRequests}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.slice(0, 5).map((r) => (
                <div key={r.id} className={clsx("px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3", !r.read && "bg-brand-50/50")}>
                  <button type="button" onClick={() => markRead(r)} className="flex-1 text-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{[r.firstName, r.lastName].filter(Boolean).join(" ")}</span>
                      {!r.read && <span className="badge badge-blue">{text.new}</span>}
                      <span className="text-xs text-slate-400">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      <a className="font-medium text-brand-700 hover:underline" href={`mailto:${r.email}`}>{r.email}</a>
                      {r.company && <span> · {r.company}</span>}
                      {r.teamSize && <span> · {r.teamSize}</span>}
                    </div>
                    {r.message && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{r.message}</p>}
                  </button>
                  <ConfirmButton message={text.deleteRequestPrompt} className="btn btn-sm btn-danger self-start lg:self-center" onConfirm={() => deleteLead(r.id)}><Trash2 size={13} /> {text.delete}</ConfirmButton>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-0 border-b border-slate-100">
            <div className="flex w-full">
              {([
                { key: "all",       label: text.all,       count: stats.total,     active: "bg-slate-700 text-white",   inactive: "text-slate-500 hover:text-slate-700 hover:bg-slate-100" },
                { key: "active",    label: text.active,    count: stats.active,    active: "bg-emerald-600 text-white", inactive: "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50" },
                { key: "pending",   label: text.pending,   count: stats.pending,   active: "bg-amber-500 text-white",   inactive: "text-slate-500 hover:text-amber-700 hover:bg-amber-50" },
                { key: "suspended", label: text.suspended, count: stats.suspended, active: "bg-rose-600 text-white",    inactive: "text-slate-500 hover:text-rose-700 hover:bg-rose-50" },
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
              {tab === "pending" ? text.noPendingCompanies : text.noCompanies}
            </div>
          ) : (
            <div className="table-wrapper border-0 rounded-none">
              <table>
                <thead>
                  <tr>
                    <th>{text.company}</th><th>{text.ownerEmail}</th><th>{text.slug}</th><th>{text.employees}</th><th>{text.max}</th><th>{text.plan}</th><th>{text.status}</th><th>{text.registered}</th><th className={isRTL ? "text-left" : "text-right"}>{text.actions}</th>
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
                          <div className="text-xs">
                            <div className="font-semibold text-slate-700 capitalize">{planLabel(c.subscription_plan)}</div>
                            <div className={clsx(
                              "capitalize",
                              (c.subscription_status || "active") === "active" ? "text-emerald-600" :
                              c.subscription_status === "trialing" ? "text-blue-600" :
                              "text-rose-600"
                            )}>{subscriptionStatusLabel(c.subscription_status)}</div>
                          </div>
                        </td>
                        <td>
                          {isPending && <span className="badge badge-yellow">{text.pending}</span>}
                          {isActive && <span className="badge badge-green">{text.active}</span>}
                          {isSuspended && <span className="badge badge-red">{text.suspended}</span>}
                        </td>
                        <td className="text-slate-500 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                        <td>
                          <div className={clsx("flex gap-2", isRTL ? "justify-start" : "justify-end")}>
                            <button className="btn btn-sm btn-secondary" disabled={busyId === c.id} onClick={() => setEditMax({ company: c, value: c.max_employees == null ? "" : String(c.max_employees) })}>
                              <Edit3 size={13} /> {text.limit}
                            </button>
                            <button className="btn btn-sm btn-secondary" disabled={busyId === c.id} onClick={() => setPageEdit({ company: c, hidden: readHiddenPages(c) })}>
                              <EyeOff size={13} /> {text.pages}
                            </button>
                            <button className="btn btn-sm btn-secondary" disabled={busyId === c.id} onClick={() => setBillingEdit({
                              company: c,
                              subscriptionPlan: c.subscription_plan || "manual",
                              subscriptionStatus: c.subscription_status || "active",
                              trialEndsAt: toDateInput(c.trial_ends_at),
                              subscriptionEndsAt: toDateInput(c.subscription_ends_at),
                              billingEmail: c.billing_email || c.owner_email || "",
                              billingNotes: c.billing_notes || "",
                            })}>
                              <CreditCard size={13} /> {text.billing}
                            </button>
                            {isPending && (
                              <>
                                <button className="btn btn-sm btn-success" disabled={busyId === c.id} onClick={() => action(c.id, "approve", text.approved(c.name))}><CheckCircle2 size={13} /> {text.approve}</button>
                                <button className="btn btn-sm btn-danger" disabled={busyId === c.id} onClick={() => action(c.id, "reject", text.rejected(c.name))}><Ban size={13} /> {text.reject}</button>
                              </>
                            )}
                            {isActive && (
                              <>
                                <button className="btn btn-sm btn-secondary" disabled={busyId === c.id} onClick={() => action(c.id, "toggle-status", text.suspendedMsg(c.name))}><Power size={13} /> {text.suspend}</button>
                                <ConfirmButton className="btn btn-sm btn-danger" disabled={busyId === c.id} message={text.deleteCompanyPrompt(c.name)} onConfirm={() => handleDelete(c)}><Trash2 size={13} /> {text.delete}</ConfirmButton>
                              </>
                            )}
                            {isSuspended && (
                              <>
                                <button className="btn btn-sm btn-success" disabled={busyId === c.id} onClick={() => action(c.id, "approve", text.reactivated(c.name))}><RefreshCw size={13} /> {text.reactivate}</button>
                                <ConfirmButton className="btn btn-sm btn-danger" disabled={busyId === c.id} message={text.deleteCompanyPrompt(c.name)} onConfirm={() => handleDelete(c)}><Trash2 size={13} /> {text.delete}</ConfirmButton>
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
        <ModalShell title={text.addCompany} onClose={() => setShowAdd(false)}>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><label className="form-label">{text.companyName} *</label><input className="form-input" value={form.companyName} onChange={(e) => autoSlug(e.target.value)} placeholder="Alpha Tech" required /></div>
              <div><label className="form-label">{text.slug} *</label><input className="form-input" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="alpha-tech" required dir="ltr" /></div>
              <div><label className="form-label">{text.ownerName} *</label><input className="form-input" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} placeholder={text.ownerName} required /></div>
              <div><label className="form-label">{text.ownerEmail} *</label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="owner@company.com" required dir="ltr" /></div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="form-label !mb-0">{text.additionalOwners}</label>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setExtraOwners((p) => [...p, { name: "", email: "" }])}><Plus size={13} /> {text.addOwner}</button>
                </div>
                {extraOwners.length === 0 && <p className="text-xs text-slate-400">{text.additionalOwnersHint}</p>}
                {extraOwners.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="form-input flex-1" placeholder={text.ownerName} value={o.name} onChange={(e) => setExtraOwners((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <input type="email" className="form-input flex-1" placeholder="email@company.com" value={o.email} onChange={(e) => setExtraOwners((p) => p.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} dir="ltr" />
                    <button type="button" className="text-rose-400 hover:text-rose-600" onClick={() => setExtraOwners((p) => p.filter((_, j) => j !== i))}><X size={16} /></button>
                  </div>
                ))}
              </div>
              <div><label className="form-label">{text.temporaryPassword}</label><input className="form-input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} dir="ltr" /></div>
              <div>
                <label className="form-label">{text.maxEmployees}</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={form.maxEmployees}
                  onChange={(e) => setForm((f) => ({ ...f, maxEmployees: e.target.value }))}
                  placeholder={text.unlimited}
                />
                <p className="text-xs text-slate-400 mt-1">{text.maxEmployeesHint}</p>
              </div>
              <div className={clsx("flex gap-2", isRTL ? "justify-start" : "justify-end")}><button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{text.cancel}</button><button type="submit" className="btn btn-primary">{text.createCompany}</button></div>
            </form>
        </ModalShell>
      )}

      {/* Edit Max Employees Modal */}
      {editMax && (
        <ModalShell title={<>{text.editEmployeeLimit} - {editMax.company.name}</>} onClose={() => setEditMax(null)}>
            <div className="space-y-4">
              <div className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-slate-500">{text.currentEmployees}: <strong className="text-slate-900">{editMax.company.employee_count ?? 0}</strong></div>
                <div className="text-slate-500">{text.currentLimit}: <strong className="text-slate-900">{editMax.company.max_employees == null ? text.unlimited : editMax.company.max_employees}</strong></div>
              </div>
              <div>
                <label className="form-label">{text.newMaxEmployees}</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={editMax.value}
                  onChange={(e) => setEditMax({ ...editMax, value: e.target.value })}
                  placeholder={text.unlimited}
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1">{text.maxEmployeesHint}</p>
              </div>
              <div className={clsx("flex gap-2", isRTL ? "justify-start" : "justify-end")}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditMax(null)}>{text.cancel}</button>
                <button type="button" className="btn btn-primary" onClick={saveMaxEmployees} disabled={busyId === editMax.company.id}>
                  {busyId === editMax.company.id ? <span className="spinner" /> : <CheckCircle2 size={15} />} {text.saveLimit}
                </button>
              </div>
            </div>
        </ModalShell>
      )}

      {/* Hidden Pages Modal */}
      {pageEdit && (
        <ModalShell title={<>{text.hidePages} - {pageEdit.company.name}</>} onClose={() => setPageEdit(null)} className="max-w-2xl">
            <p className="text-sm text-slate-500 mb-4">{text.hidePagesHint}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {HIDDEN_PAGE_OPTIONS.map((page) => {
                const checked = pageEdit.hidden.includes(page.key);
                return (
                  <label key={page.key} className={clsx("flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition", checked ? "border-rose-200 bg-rose-50" : "border-slate-200 hover:bg-slate-50")}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setPageEdit((p) => {
                          if (!p) return p;
                          const hidden = e.target.checked
                            ? Array.from(new Set([...p.hidden, page.key]))
                            : p.hidden.filter((k) => k !== page.key);
                          return { ...p, hidden };
                        });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-sm font-medium text-slate-800">{page.label}</span>
                  </label>
                );
              })}
            </div>
            <div className={clsx("flex gap-2 mt-5", isRTL ? "justify-start" : "justify-end")}>
              <button type="button" className="btn btn-secondary" onClick={() => setPageEdit(null)}>{text.cancel}</button>
              <button type="button" className="btn btn-primary" onClick={saveHiddenPages} disabled={busyId === pageEdit.company.id}>
                {busyId === pageEdit.company.id ? <span className="spinner" /> : <CheckCircle2 size={15} />} {text.savePages}
              </button>
            </div>
        </ModalShell>
      )}

      {/* Billing Modal */}
      {billingEdit && (
        <ModalShell title={<>{text.billingTitle} - {billingEdit.company.name}</>} onClose={() => setBillingEdit(null)} className="max-w-xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">{text.plan}</label>
                <select className="form-input" value={billingEdit.subscriptionPlan} onChange={(e) => setBillingEdit({ ...billingEdit, subscriptionPlan: e.target.value })}>
                  <option value="manual">Manual</option>
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="form-label">{text.status}</label>
                <select className="form-input" value={billingEdit.subscriptionStatus} onChange={(e) => setBillingEdit({ ...billingEdit, subscriptionStatus: e.target.value })}>
                  <option value="trialing">{isRTL ? "تجربة" : "Trialing"}</option>
                  <option value="active">{text.active}</option>
                  <option value="past_due">{isRTL ? "دفع متأخر" : "Past due"}</option>
                  <option value="suspended">{text.suspended}</option>
                  <option value="cancelled">{isRTL ? "ملغي" : "Cancelled"}</option>
                </select>
              </div>
              <div>
                <label className="form-label">{text.trialEnds}</label>
                <input type="date" className="form-input" value={billingEdit.trialEndsAt} onChange={(e) => setBillingEdit({ ...billingEdit, trialEndsAt: e.target.value })} />
              </div>
              <div>
                <label className="form-label">{text.subscriptionEnds}</label>
                <input type="date" className="form-input" value={billingEdit.subscriptionEndsAt} onChange={(e) => setBillingEdit({ ...billingEdit, subscriptionEndsAt: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="form-label">{text.billingEmail}</label>
              <input type="email" className="form-input" value={billingEdit.billingEmail} onChange={(e) => setBillingEdit({ ...billingEdit, billingEmail: e.target.value })} placeholder="billing@company.com" dir="ltr" />
            </div>
            <div>
              <label className="form-label">{text.billingNotes}</label>
              <textarea className="form-input min-h-[100px]" value={billingEdit.billingNotes} onChange={(e) => setBillingEdit({ ...billingEdit, billingNotes: e.target.value })} placeholder={text.billingNotesPlaceholder} />
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {text.billingWarning}
            </div>
            <div className={clsx("flex gap-2", isRTL ? "justify-start" : "justify-end")}>
              <button type="button" className="btn btn-secondary" onClick={() => setBillingEdit(null)}>{text.cancel}</button>
              <button type="button" className="btn btn-primary" onClick={saveBilling} disabled={busyId === billingEdit.company.id}>
                {busyId === billingEdit.company.id ? <span className="spinner" /> : <CheckCircle2 size={15} />} {text.saveBilling}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
