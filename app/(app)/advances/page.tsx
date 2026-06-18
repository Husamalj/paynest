"use client";

import { useEffect, useState } from "react";
import { Banknote, Check, XCircle, AlertTriangle, X, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import clsx from "clsx";

function fmt(v: unknown) {
  return (parseFloat(String(v)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdvancesPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/advances"); setRows(r.data || []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (id: number, status: string) => {
    setBusy(id);
    try {
      await api.put(`/advances/${id}`, { status });
      setSuccess(ar ? (status === "approved" ? "تمت الموافقة وخُصمت من الراتب" : "تم الرفض") : (status === "approved" ? "Approved and deducted from salary" : "Rejected"));
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const totalPending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);
  const totalApproved = rows.filter((r) => r.status === "approved").reduce((s, r) => s + Number(r.amount), 0);

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{ar ? "جاري التحميل" : "Loading"}</div>;

  return (
    <div className="space-y-6">
      <div className="page-header"><div><h2 className="page-title">{ar ? "سلف الموظفين" : "Salary Advances"}</h2><p className="page-subtitle">{ar ? "طلبات السلف وموافقتها — تُخصم من الراتب تلقائياً" : "Advance requests & approval — auto-deducted from salary"}</p></div></div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")}><X size={14} /></button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{ar ? "بانتظار الموافقة" : "Pending"}</div><div className="text-xl font-bold text-amber-600">{fmt(totalPending)}</div></div>
        <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{ar ? "موافق عليها" : "Approved"}</div><div className="text-xl font-bold text-emerald-600">{fmt(totalApproved)}</div></div>
        <div className="card"><div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{ar ? "إجمالي الطلبات" : "Total requests"}</div><div className="text-xl font-bold text-slate-900">{rows.length}</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Banknote size={16} className="text-brand-600" />{ar ? "الطلبات" : "Requests"}</div>
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden h-9 text-sm">
            {[["all", ar ? "الكل" : "All"], ["pending", ar ? "معلّق" : "Pending"], ["approved", ar ? "موافق" : "Approved"], ["rejected", ar ? "مرفوض" : "Rejected"]].map(([k, l], i) => (
              <button key={k} onClick={() => setFilter(k)} className={clsx("px-3 font-medium", i > 0 && "border-s border-slate-200", filter === k ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>{l}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? <div className="text-center py-12 text-sm text-slate-400">{ar ? "لا يوجد طلبات" : "No requests"}</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>{ar ? "الموظف" : "Employee"}</th><th className="text-right">{ar ? "المبلغ" : "Amount"}</th><th>{ar ? "أقساط" : "Installments"}</th><th>{ar ? "السبب" : "Reason"}</th><th>{ar ? "الحالة" : "Status"}</th><th className="text-right">{ar ? "إجراءات" : "Actions"}</th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.employeeName || r.employeeId}<div className="text-[11px] font-mono text-slate-400">{r.employeeId}</div></td>
                    <td className="text-right font-mono font-semibold">{fmt(r.amount)}</td>
                    <td className="text-center">{r.installments > 1 ? `${r.installments} ${ar ? "شهر" : "mo"}` : (ar ? "دفعة واحدة" : "One-time")}</td>
                    <td className="text-sm text-slate-600 max-w-[200px]"><div className="truncate">{r.reason || "-"}</div></td>
                    <td>
                      {r.status === "approved" && <span className="badge badge-green">{ar ? "موافق عليه" : "Approved"}</span>}
                      {r.status === "rejected" && <span className="badge badge-red">{ar ? "مرفوض" : "Rejected"}</span>}
                      {r.status === "pending" && <span className="badge badge-yellow">{ar ? "معلّق" : "Pending"}</span>}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "pending"
                          ? (<>
                              <button className="btn btn-sm btn-success" disabled={busy === r.id} onClick={() => decide(r.id, "approved")}><Check size={12} />{ar ? "موافقة" : "Approve"}</button>
                              <button className="btn btn-sm btn-danger" disabled={busy === r.id} onClick={() => decide(r.id, "rejected")}><XCircle size={12} />{ar ? "رفض" : "Reject"}</button>
                            </>)
                          : <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
