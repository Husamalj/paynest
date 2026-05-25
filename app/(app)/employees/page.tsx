"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Plus, AlertTriangle, CheckCircle2, X, Shield, Edit2, Trash2, Calendar, Phone, Mail, Hash } from "lucide-react";
import clsx from "clsx";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

function formatCurrency(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const religionOptions = [
  { value: "muslim", ar: "مسلم", en: "Muslim" },
  { value: "christian", ar: "مسيحي", en: "Christian" },
  { value: "buddhist", ar: "بوذي", en: "Buddhist" },
];

const COUNTRIES = [
  { code: "JO", name: "Jordan", dial: "+962", flag: "🇯🇴" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { code: "AE", name: "UAE", dial: "+971", flag: "🇦🇪" },
  { code: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭" },
  { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦" },
  { code: "OM", name: "Oman", dial: "+968", flag: "🇴🇲" },
  { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
  { code: "LB", name: "Lebanon", dial: "+961", flag: "🇱🇧" },
  { code: "SY", name: "Syria", dial: "+963", flag: "🇸🇾" },
  { code: "IQ", name: "Iraq", dial: "+964", flag: "🇮🇶" },
  { code: "PS", name: "Palestine", dial: "+970", flag: "🇵🇸" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷" },
];

function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const dialMatch = COUNTRIES.find((c) => value.startsWith(c.dial));
  const [dialCode, setDialCode] = useState(dialMatch?.dial ?? "+962");
  const [local, setLocal] = useState(dialMatch ? value.slice(dialMatch.dial.length) : value);

  const handleDial = (d: string) => {
    setDialCode(d);
    onChange(d + local);
  };
  const handleLocal = (v: string) => {
    setLocal(v);
    onChange(dialCode + v);
  };

  return (
    <div className="flex gap-2">
      <select
        className="form-input w-36 flex-shrink-0"
        value={dialCode}
        onChange={(e) => handleDial(e.target.value)}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.dial}>
            {c.flag} {c.dial}
          </option>
        ))}
      </select>
      <input
        type="tel"
        className="form-input flex-1"
        placeholder="7XXXXXXXX"
        value={local}
        onChange={(e) => handleLocal(e.target.value)}
      />
    </div>
  );
}

const emptyForm = { employee_id: "", name: "", email: "", phone: "", base_salary: "", social_security: false, religion: "" };

export default function EmployeesPage() {
  const { t, lang } = useLanguage();
  const [employees, setEmployees] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", base_salary: "", social_security: false, religion: "" });

  const religionLabel = (value: string) => {
    const item = religionOptions.find((r) => r.value === value);
    if (!item) return lang === "ar" ? "غير محدد" : "Not selected";
    return (item as any)[lang] || item.en;
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const [empRes, balRes] = await Promise.all([api.get("/employees"), api.get("/leaves/balances")]);
      const list = empRes.data || [];
      setEmployees(list);
      setBalances(balRes.data || []);
      if (!selectedId && list.length) setSelectedId(list[0].employee_id);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadEmployees(); }, []);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      String(e.employee_id || "").toLowerCase().includes(q) ||
      String(e.name || "").toLowerCase().includes(q) ||
      String(e.email || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  const selectedEmployee = employees.find((e) => e.employee_id === selectedId) || null;
  const selectedBalance = balances.find((b) => b.employee_id === selectedId) || null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.name || !form.email || !form.base_salary) { setError(t("fillRequired")); return; }
    try {
      await api.post("/employees", { ...form, base_salary: parseFloat(form.base_salary) });
      setSuccess(lang === "ar" ? "تمت إضافة الموظف وإنشاء حساب دخول له بكلمة السر 123456" : "Employee added and login account created with password 123456");
      setShowAdd(false); setForm({ ...emptyForm });
      await loadEmployees(); setSelectedId(form.employee_id);
    } catch (err: any) { setError(err.message); }
  };

  const openEdit = () => {
    if (!selectedEmployee) return;
    setEditForm({
      name: selectedEmployee.name || "",
      email: selectedEmployee.email || "",
      phone: selectedEmployee.phone || "",
      base_salary: selectedEmployee.base_salary || "",
      social_security: !!selectedEmployee.social_security,
      religion: selectedEmployee.religion || "",
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!editForm.name || !editForm.email || !editForm.base_salary) { setError(t("fillRequired")); return; }
    setSavingEdit(true);
    try {
      const res = await api.put(`/employees/${selectedEmployee.employee_id}`, { ...editForm, base_salary: parseFloat(editForm.base_salary) });
      setEmployees((p) => p.map((emp) => emp.employee_id === selectedEmployee.employee_id ? res.data : emp));
      setSuccess(lang === "ar" ? "تم تعديل بيانات الموظف" : "Employee updated successfully");
      setShowEdit(false);
    } catch (err: any) { setError(err.message); }
    finally { setSavingEdit(false); }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    setDeleting(true);
    try {
      await api.delete(`/employees/${selectedEmployee.employee_id}`);
      const next = employees.filter((e) => e.employee_id !== selectedEmployee.employee_id);
      setEmployees(next); setSelectedId(next[0]?.employee_id || ""); setShowDeleteConfirm(false);
      setSuccess(lang === "ar" ? "تم حذف الموظف" : "Employee deleted successfully");
    } catch (err: any) { setError(err.message); }
    finally { setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  const emailTitle = lang === "ar" ? "البريد الإلكتروني" : "Email";
  const phoneTitle = lang === "ar" ? "رقم الهاتف" : "Phone";
  const religionTitle = lang === "ar" ? "الديانة" : "Religion";

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("employees")}</h2><p className="page-subtitle">{t("employeeManagement")}</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> {t("addEmployee")}</button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Employee list */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="card-title"><Users size={16} className="text-brand-600" /> {t("employeeList")}</div>
            <input className="form-input w-60" placeholder={t("searchEmployee")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="table-wrapper">
            {filteredEmployees.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{t("noEmployees")}</div> : (
              <table>
                <thead>
                  <tr>
                    <th />
                    <th>{t("employeeId")}</th>
                    <th>{t("name")}</th>
                    <th>{emailTitle}</th>
                    <th className="text-right">{t("baseSalary")}</th>
                    <th className="text-right">{t("socialSecurity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employee_id} className={clsx("group cursor-pointer", emp.employee_id === selectedId && "bg-brand-50")} onClick={() => setSelectedId(emp.employee_id)}>
                      <td className="pl-3" />
                      <td className="font-mono text-xs text-slate-500">{emp.employee_id}</td>
                      <td className="font-medium">{emp.name}</td>
                      <td className="text-sm text-slate-600 max-w-[180px]"><div className="truncate">{emp.email || "-"}</div></td>
                      <td className="text-right font-mono">{formatCurrency(emp.base_salary)}</td>
                      <td className="text-right">{emp.social_security ? <span className="badge badge-purple"><Shield size={11} /> {t("enabled")}</span> : <span className="badge badge-gray">{t("disabled")}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="card compact">
          <div className="card-header">
            <div className="card-title">{t("employeeDetails")}</div>
            {selectedEmployee && (
              <div className="flex items-center gap-2">
                <button className="btn btn-sm btn-secondary" onClick={openEdit}><Edit2 size={13} />{lang === "ar" ? "تعديل" : "Edit"}</button>
                <button className="btn btn-sm btn-danger" onClick={() => setShowDeleteConfirm(true)}><Trash2 size={13} />{lang === "ar" ? "حذف" : "Delete"}</button>
              </div>
            )}
          </div>

          {!selectedEmployee ? (
            <div className="text-sm text-slate-400">{t("selectEmployee")}</div>
          ) : (
            <div className="space-y-5">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {selectedEmployee.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold text-slate-900 truncate">{selectedEmployee.name}</div>
                  <div className="text-xs font-mono text-slate-400">{selectedEmployee.employee_id}</div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {/* Email */}
                <div className="flex items-start gap-3 py-3">
                  <Mail size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{emailTitle}</div>
                    <div className="text-sm text-slate-800 break-all leading-snug">{selectedEmployee.email || "-"}</div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3 py-3">
                  <Phone size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{phoneTitle}</div>
                    <div className="text-sm text-slate-800">{selectedEmployee.phone || "-"}</div>
                  </div>
                </div>

                {/* Base salary */}
                <div className="flex items-start gap-3 py-3">
                  <Hash size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{t("baseSalary")}</div>
                    <div className="text-sm font-mono font-semibold text-slate-900">{formatCurrency(selectedEmployee.base_salary)}</div>
                  </div>
                </div>

                {/* Religion + SS row */}
                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{religionTitle}</div>
                    <div className="text-sm font-medium text-slate-800">{religionLabel(selectedEmployee.religion)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{t("socialSecurity")}</div>
                    <div>{selectedEmployee.social_security ? <span className="badge badge-purple"><Shield size={11} /> {t("enabled")}</span> : <span className="badge badge-gray">{t("disabled")}</span>}</div>
                  </div>
                </div>

                {/* Leave balance */}
                <div className="py-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{lang === "ar" ? "الإجازات السنوية المتبقية" : "Annual Leave Remaining"}</div>
                  <span className={clsx("badge", Number(selectedBalance?.annual_remaining ?? 14) > 5 ? "badge-green" : Number(selectedBalance?.annual_remaining ?? 14) > 0 ? "badge-yellow" : "badge-red")}>
                    <Calendar size={11} />{selectedBalance?.annual_remaining ?? 14} {lang === "ar" ? "يوم" : "days"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{t("newEmployee")}</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><label className="form-label">{t("employeeId")} *</label><input className="form-input" value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} placeholder="EMP-001" /></div>
              <div><label className="form-label">{t("name")} *</label><input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="form-label">{emailTitle} *</label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="employee@company.com" /></div>
              <div>
                <label className="form-label">{phoneTitle}</label>
                <PhoneInput value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
              </div>
              <div><label className="form-label">{t("baseSalary")} *</label><input type="number" className="form-input" value={form.base_salary} onChange={(e) => setForm((f) => ({ ...f, base_salary: e.target.value }))} placeholder="0.00" /></div>
              <div><label className="form-label">{religionTitle}</label><select className="form-input" value={form.religion} onChange={(e) => setForm((f) => ({ ...f, religion: e.target.value }))}><option value="">{lang === "ar" ? "اختر الديانة" : "Select religion"}</option>{religionOptions.map((r) => <option key={r.value} value={r.value}>{(r as any)[lang] || r.en}</option>)}</select></div>
              <div className="flex items-center justify-between"><div className="text-sm font-medium text-slate-700">{t("socialSecurity")}</div><label className="toggle"><input type="checkbox" checked={form.social_security} onChange={(e) => setForm((f) => ({ ...f, social_security: e.target.checked }))} /><span className="toggle-slider" /></label></div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t("cancel")}</button><button type="submit" className="btn btn-primary">{t("save")}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{lang === "ar" ? "تعديل الموظف" : "Edit Employee"}</h3>
              <button className="modal-close" onClick={() => setShowEdit(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div><label className="form-label">{t("employeeId")}</label><input className="form-input bg-slate-50" value={selectedEmployee?.employee_id || ""} disabled /></div>
              <div><label className="form-label">{t("name")} *</label><input className="form-input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="form-label">{emailTitle} *</label><input type="email" className="form-input" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div>
                <label className="form-label">{phoneTitle}</label>
                <PhoneInput value={editForm.phone} onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))} />
              </div>
              <div><label className="form-label">{t("baseSalary")} *</label><input type="number" className="form-input" value={editForm.base_salary} onChange={(e) => setEditForm((f) => ({ ...f, base_salary: e.target.value }))} /></div>
              <div><label className="form-label">{religionTitle}</label><select className="form-input" value={editForm.religion} onChange={(e) => setEditForm((f) => ({ ...f, religion: e.target.value }))}><option value="">{lang === "ar" ? "اختر الديانة" : "Select religion"}</option>{religionOptions.map((r) => <option key={r.value} value={r.value}>{(r as any)[lang] || r.en}</option>)}</select></div>
              <div className="flex items-center justify-between"><div className="text-sm font-medium text-slate-700">{t("socialSecurity")}</div><label className="toggle"><input type="checkbox" checked={editForm.social_security} onChange={(e) => setEditForm((f) => ({ ...f, social_security: e.target.checked }))} /><span className="toggle-slider" /></label></div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>{t("cancel")}</button><button type="submit" className="btn btn-primary" disabled={savingEdit}>{savingEdit ? <span className="spinner" /> : null}{t("save")}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0"><Trash2 size={20} /></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">{lang === "ar" ? "تأكيد الحذف" : "Delete Employee"}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-6">{lang === "ar" ? "هل أنت متأكد من حذف هذا الموظف؟" : "Are you sure you want to delete this employee?"}</p>
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                  <div className="font-semibold text-slate-900">{selectedEmployee.name}</div>
                  <div className="text-slate-500 font-mono text-xs mt-1">{selectedEmployee.employee_id}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>{lang === "ar" ? "لا" : "Cancel"}</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? <span className="spinner" /> : <Trash2 size={15} />}{lang === "ar" ? "نعم، حذف" : "Yes, Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
