"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Check, XCircle, AlertTriangle, CheckCircle2, Settings2, Inbox } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

type Field = { key: string; label: string; type: string; required: boolean };

const FIELD_TYPES = ["text", "textarea", "number", "date", "file"];

export default function RequestTypesPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [types, setTypes] = useState<any[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<Field[]>([]);

  const tLabel = (t: string) => ({ text: ar ? "نص" : "Text", textarea: ar ? "نص طويل" : "Long text", number: ar ? "رقم" : "Number", date: ar ? "تاريخ" : "Date", file: ar ? "ملف" : "File" }[t] || t);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([api.get("/request-types"), api.get("/custom-requests")]);
      setTypes(tRes.data || []); setReqs(rRes.data || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addField = () => setFields((f) => [...f, { key: `f${f.length + 1}`, label: "", type: "text", required: false }]);
  const updField = (i: number, patch: Partial<Field>) => setFields((f) => f.map((x, j) => j === i ? { ...x, ...patch } : x));
  const rmField = (i: number) => setFields((f) => f.filter((_, j) => j !== i));

  const createType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(ar ? "اكتب اسم الطلب" : "Enter a request name"); return; }
    try {
      await api.post("/request-types", { name, fields });
      setSuccess(ar ? "تمت الإضافة" : "Added"); setShowAdd(false); setName(""); setFields([]);
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const delType = async (id: number) => {
    if (!window.confirm(ar ? "حذف نوع الطلب؟" : "Delete this request type?")) return;
    try { await api.delete(`/request-types/${id}`); setTypes((p) => p.filter((t) => t.id !== id)); }
    catch (e: any) { setError(e.message); }
  };

  const decide = async (id: number, status: "approved" | "rejected") => {
    setBusy(id);
    try { await api.put(`/custom-requests/${id}`, { status }); await load(); setSuccess(status === "approved" ? (ar ? "تمت الموافقة" : "Approved") : (ar ? "تم الرفض" : "Rejected")); }
    catch (e: any) { setError(e.message); } finally { setBusy(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />...</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{ar ? "الطلبات المخصّصة" : "Custom Requests"}</h2><p className="page-subtitle">{ar ? "عرّف أنواع طلبات خاصة بشركتك" : "Define request types for your company"}</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> {ar ? "نوع طلب جديد" : "New type"}</button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")}><X size={14} /></button></div>}

      {/* Request types */}
      <div className="card">
        <div className="card-header"><div className="card-title"><Settings2 size={16} className="text-brand-600" />{ar ? "أنواع الطلبات" : "Request types"}</div></div>
        {types.length === 0 ? <div className="text-center py-8 text-sm text-slate-400">{ar ? "لا يوجد أنواع بعد" : "No types yet"}</div> : (
          <div className="space-y-2">
            {types.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-500">{(t.fields || []).map((f: any) => `${f.label}${f.required ? "*" : ""} (${tLabel(f.type)})`).join(" · ") || (ar ? "بدون حقول" : "No fields")}</div>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => delType(t.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submitted requests */}
      <div className="card">
        <div className="card-header"><div className="card-title"><Inbox size={16} className="text-brand-600" />{ar ? "الطلبات المقدّمة" : "Submitted requests"}</div></div>
        {reqs.length === 0 ? <div className="text-center py-8 text-sm text-slate-400">{ar ? "لا يوجد طلبات" : "No requests"}</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>{ar ? "الموظف" : "Employee"}</th><th>{ar ? "النوع" : "Type"}</th><th>{ar ? "التفاصيل" : "Details"}</th><th>{ar ? "الحالة" : "Status"}</th><th className="text-right">{ar ? "إجراءات" : "Actions"}</th></tr></thead>
              <tbody>
                {reqs.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.employeeName || r.employeeId}</td>
                    <td>{r.typeName}</td>
                    <td className="text-xs text-slate-600 max-w-[280px]">{Object.entries(r.values || {}).map(([k, v]) => <div key={k}><span className="text-slate-400">{k}:</span> {String(v).startsWith("data:") ? (ar ? "ملف" : "file") : String(v)}</div>)}</td>
                    <td><span className={`badge ${r.status === "approved" ? "badge-green" : r.status === "rejected" ? "badge-red" : "badge-yellow"}`}>{r.status === "approved" ? (ar ? "موافق" : "Approved") : r.status === "rejected" ? (ar ? "مرفوض" : "Rejected") : (ar ? "معلّق" : "Pending")}</span></td>
                    <td className="text-right">
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <button className="btn btn-sm btn-success" disabled={busy === r.id} onClick={() => decide(r.id, "approved")}><Check size={12} />{ar ? "موافقة" : "Approve"}</button>
                          <button className="btn btn-sm btn-danger" disabled={busy === r.id} onClick={() => decide(r.id, "rejected")}><XCircle size={12} />{ar ? "رفض" : "Reject"}</button>
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal max-w-lg">
            <div className="modal-header"><h3 className="modal-title">{ar ? "نوع طلب جديد" : "New request type"}</h3><button className="modal-close" onClick={() => setShowAdd(false)}><X size={18} /></button></div>
            <form onSubmit={createType} className="space-y-4">
              <div><label className="form-label">{ar ? "اسم الطلب" : "Request name"} *</label><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={ar ? "مثال: طلب فيزا" : "e.g. Visa request"} required /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><label className="form-label !mb-0">{ar ? "الحقول" : "Fields"}</label><button type="button" className="btn btn-sm btn-secondary" onClick={addField}><Plus size={13} /> {ar ? "حقل" : "Field"}</button></div>
                {fields.length === 0 && <p className="text-xs text-slate-400">{ar ? "أضف الحقول اللي بدك الموظف يعبّيها" : "Add the fields the employee should fill"}</p>}
                {fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="form-input flex-1" placeholder={ar ? "اسم الحقل" : "Field label"} value={f.label} onChange={(e) => updField(i, { label: e.target.value })} />
                    <select className="form-input w-28" value={f.type} onChange={(e) => updField(i, { type: e.target.value })}>{FIELD_TYPES.map((t) => <option key={t} value={t}>{tLabel(t)}</option>)}</select>
                    <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap"><input type="checkbox" checked={f.required} onChange={(e) => updField(i, { required: e.target.checked })} />{ar ? "إلزامي" : "Req."}</label>
                    <button type="button" className="text-rose-400 hover:text-rose-600" onClick={() => rmField(i)}><X size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{ar ? "إلغاء" : "Cancel"}</button><button type="submit" className="btn btn-primary">{ar ? "حفظ" : "Save"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
