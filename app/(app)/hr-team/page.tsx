"use client";

import { useEffect, useState } from "react";
import {
  Users, Plus, Edit2, Trash2, Mail, Phone, Hash, X,
  AlertTriangle, CheckCircle2, Eye, EyeOff, ShieldCheck,
  Calendar,
} from "lucide-react";
import clsx from "clsx";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const COUNTRIES = [
  { code: "JO", dial: "+962", flag: "🇯🇴" }, { code: "SA", dial: "+966", flag: "🇸🇦" },
  { code: "AE", dial: "+971", flag: "🇦🇪" }, { code: "KW", dial: "+965", flag: "🇰🇼" },
  { code: "EG", dial: "+20",  flag: "🇪🇬" }, { code: "LB", dial: "+961", flag: "🇱🇧" },
  { code: "PS", dial: "+970", flag: "🇵🇸" }, { code: "US", dial: "+1",   flag: "🇺🇸" },
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

function formatCurrency(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const emptyForm = { name: "", email: "", password: "", phone: "", base_salary: "" };

export default function HRTeamPage() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";

  const [hrs, setHrs] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  /* ─── Add modal ─── */
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ ...emptyForm });
  const [showAddPwd, setShowAddPwd] = useState(false);
  const [addBusy, setAddBusy]   = useState(false);

  /* ─── Edit modal ─── */
  const [showEdit, setShowEdit]   = useState(false);
  const [editForm, setEditForm]   = useState({ name: "", email: "", phone: "", base_salary: "" });
  const [editBusy, setEditBusy]   = useState(false);

  /* ─── Delete confirm ─── */
  const [showDel, setShowDel] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/company-hrs");
      const list: any[] = res.data || [];
      setHrs(list);
      if (!selectedId && list.length) setSelectedId(list[0].id);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const selected = hrs.find((h) => h.id === selectedId) ?? null;

  /* ── Add ── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email) { setError(ar ? "الاسم والبريد مطلوبان" : "Name and email are required"); return; }
    setAddBusy(true);
    try {
      await api.post("/auth/create-hr", {
        name: addForm.name,
        email: addForm.email,
        password: addForm.password || "123456",
        phone: addForm.phone,
        base_salary: parseFloat(addForm.base_salary) || 0,
      });
      setSuccess(ar ? "تمت إضافة مدير HR بنجاح" : "HR manager added successfully");
      setShowAdd(false);
      setAddForm({ ...emptyForm });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setAddBusy(false); }
  };

  /* ── Edit ── */
  const openEdit = () => {
    if (!selected) return;
    setEditForm({
      name: selected.name || "",
      email: selected.email || "",
      phone: selected.phone || "",
      base_salary: String(selected.base_salary ?? ""),
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setEditBusy(true);
    try {
      const res = await api.put(`/auth/company-hrs/${selected.id}`, editForm);
      setHrs((prev) => prev.map((h) => h.id === selected.id ? { ...h, ...res.data } : h));
      setSuccess(ar ? "تم تعديل بيانات مدير HR" : "HR manager updated");
      setShowEdit(false);
    } catch (e: any) { setError(e.message); }
    finally { setEditBusy(false); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!selected) return;
    setDelBusy(true);
    try {
      await api.delete(`/auth/company-hrs/${selected.id}`);
      const next = hrs.filter((h) => h.id !== selected.id);
      setHrs(next);
      setSelectedId(next[0]?.id ?? null);
      setShowDel(false);
      setSuccess(ar ? "تم حذف مدير HR" : "HR manager removed");
    } catch (e: any) { setError(e.message); }
    finally { setDelBusy(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
      <span className="spinner spinner-dark w-5 h-5" />
      {ar ? "جاري التحميل..." : "Loading..."}
    </div>
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{ar ? "فريق الموارد البشرية" : "HR Team"}</h2>
          <p className="page-subtitle">
            {ar ? "إدارة حسابات مديري الموارد البشرية" : "Manage HR manager accounts"}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setShowAdd(true); setAddForm({ ...emptyForm }); setError(""); }}
        >
          <Plus size={15} />
          {ar ? "إضافة مدير HR" : "Add HR Manager"}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess("")}><X size={14} /></button>
        </div>
      )}

      {/* Main layout: table + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="card-title">
              <Users size={16} className="text-brand-600" />
              {ar ? "قائمة مديري HR" : "HR Managers"}
            </div>
          </div>
          {hrs.length === 0 ? (
            <div className="text-center py-16 text-sm text-slate-400">
              <ShieldCheck size={32} className="mx-auto mb-3 text-slate-200" />
              {ar ? "لا يوجد مديرو موارد بشرية بعد" : "No HR managers yet"}
              <div className="mt-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setShowAdd(true); setAddForm({ ...emptyForm }); }}
                >
                  <Plus size={13} />
                  {ar ? "إضافة الأول" : "Add first one"}
                </button>
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{ar ? "الاسم" : "Name"}</th>
                    <th>{ar ? "البريد" : "Email"}</th>
                    <th>{ar ? "رقم الموظف" : "Emp. No."}</th>
                    <th className="text-right">{ar ? "الراتب" : "Salary"}</th>
                    <th>{ar ? "تاريخ الإضافة" : "Added"}</th>
                  </tr>
                </thead>
                <tbody>
                  {hrs.map((hr) => (
                    <tr
                      key={hr.id}
                      className={clsx("cursor-pointer", hr.id === selectedId && "bg-brand-50")}
                      onClick={() => setSelectedId(hr.id)}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {hr.name?.[0]?.toUpperCase() || "H"}
                          </div>
                          <span className="font-medium">{hr.name}</span>
                        </div>
                      </td>
                      <td><div className="text-sm text-slate-500 truncate max-w-[160px]">{hr.email || "—"}</div></td>
                      <td><span className="font-mono text-xs text-slate-400">{hr.employeeNumber || "—"}</span></td>
                      <td className="text-right font-mono text-sm">{formatCurrency(hr.base_salary)}</td>
                      <td className="text-sm text-slate-400">
                        {hr.createdAt ? new Date(hr.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="card compact">
          <div className="card-header">
            <div className="card-title">{ar ? "تفاصيل المدير" : "HR Details"}</div>
            {selected && (
              <div className="flex gap-2">
                <button className="btn btn-sm btn-secondary" onClick={openEdit}><Edit2 size={13} /></button>
                <button className="btn btn-sm btn-danger" onClick={() => setShowDel(true)}><Trash2 size={13} /></button>
              </div>
            )}
          </div>

          {!selected ? (
            <div className="text-sm text-slate-400 text-center py-8">
              {ar ? "اختر مدير HR من القائمة" : "Select an HR manager"}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {selected.name?.[0]?.toUpperCase() || "H"}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{selected.name}</div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold uppercase mt-0.5">
                    <ShieldCheck size={10} /> HR
                  </span>
                </div>
              </div>

              {/* Fields */}
              <div className="divide-y divide-slate-100">
                <div className="flex items-start gap-3 py-2.5">
                  <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      {ar ? "البريد الإلكتروني" : "Email"}
                    </div>
                    <div className="text-sm break-all">{selected.email || "—"}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-2.5">
                  <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      {ar ? "الهاتف" : "Phone"}
                    </div>
                    <div className="text-sm">{selected.phone || "—"}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-2.5">
                  <Hash size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      {ar ? "رقم الموظف" : "Employee Number"}
                    </div>
                    <div className="text-sm font-mono">{selected.employeeNumber || "—"}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-2.5">
                  <Hash size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      {ar ? "الراتب الأساسي" : "Base Salary"}
                    </div>
                    <div className="text-sm font-mono font-bold">{formatCurrency(selected.base_salary)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-2.5">
                  <Calendar size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      {ar ? "تاريخ الإضافة" : "Added On"}
                    </div>
                    <div className="text-sm">
                      {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-2.5">
                  <ShieldCheck size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      {ar ? "حالة كلمة السر" : "Password Status"}
                    </div>
                    <div className="text-sm">
                      {selected.mustChangePassword ? (
                        <span className="badge badge-yellow">{ar ? "يجب التغيير" : "Must change"}</span>
                      ) : (
                        <span className="badge badge-green">{ar ? "مُحدَّثة" : "Updated"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add HR Modal ── */}
      {showAdd && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{ar ? "إضافة مدير HR" : "Add HR Manager"}</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="form-label">{ar ? "الاسم الكامل" : "Full Name"} *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={ar ? "محمد أحمد" : "John Smith"}
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label">{ar ? "البريد الإلكتروني" : "Email Address"} *</label>
                <input
                  type="email"
                  className="form-input"
                  dir="ltr"
                  placeholder="hr@company.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  {ar ? "كلمة السر المؤقتة" : "Temporary Password"}
                  <span className="text-slate-400 font-normal ml-1">
                    ({ar ? "الافتراضي: 123456" : "default: 123456"})
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showAddPwd ? "text" : "password"}
                    className="form-input pr-10"
                    dir="ltr"
                    placeholder="123456"
                    value={addForm.password}
                    onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showAddPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">{ar ? "رقم الهاتف" : "Phone Number"}</label>
                <PhoneInput
                  value={addForm.phone}
                  onChange={(v) => setAddForm((p) => ({ ...p, phone: v }))}
                />
              </div>

              <div>
                <label className="form-label">{ar ? "الراتب الأساسي" : "Base Salary"}</label>
                <input
                  type="number"
                  className="form-input"
                  dir="ltr"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={addForm.base_salary}
                  onChange={(e) => setAddForm((p) => ({ ...p, base_salary: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowAdd(false)}>
                  {ar ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" disabled={addBusy} className="btn btn-primary flex-1">
                  {addBusy ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "إضافة" : "Add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit HR Modal ── */}
      {showEdit && selected && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false); }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{ar ? "تعديل بيانات HR" : "Edit HR Manager"}</h3>
              <button className="modal-close" onClick={() => setShowEdit(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="form-label">{ar ? "الاسم الكامل" : "Full Name"}</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">{ar ? "البريد الإلكتروني" : "Email Address"}</label>
                <input
                  type="email"
                  className="form-input"
                  dir="ltr"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">{ar ? "رقم الهاتف" : "Phone Number"}</label>
                <PhoneInput
                  value={editForm.phone}
                  onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))}
                />
              </div>

              <div>
                <label className="form-label">{ar ? "الراتب الأساسي" : "Base Salary"}</label>
                <input
                  type="number"
                  className="form-input"
                  dir="ltr"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={editForm.base_salary}
                  onChange={(e) => setEditForm((p) => ({ ...p, base_salary: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowEdit(false)}>
                  {ar ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" disabled={editBusy} className="btn btn-primary flex-1">
                  {editBusy ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {showDel && selected && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDel(false); }}
        >
          <div className="modal max-w-sm">
            <div className="modal-header">
              <h3 className="modal-title text-red-600">{ar ? "تأكيد الحذف" : "Confirm Delete"}</h3>
              <button className="modal-close" onClick={() => setShowDel(false)}><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              {ar
                ? `هل أنت متأكد من حذف "${selected.name}"؟ سيتم حذف الحساب وبياناته نهائياً.`
                : `Are you sure you want to remove "${selected.name}"? This cannot be undone.`}
            </p>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setShowDel(false)}>
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button className="btn btn-danger flex-1" disabled={delBusy} onClick={handleDelete}>
                {delBusy ? (ar ? "جاري الحذف..." : "Deleting...") : (ar ? "حذف" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
