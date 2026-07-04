"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle2, X, Pencil } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";
import ConfirmButton from "@/components/ConfirmButton";
import ModalShell from "@/components/ModalShell";

export default function AnnouncementsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", published: false });

  const load = async () => {
    setLoading(true);
    try { const res = await api.get("/announcements?all=true"); setItems(res.data || []); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/announcements", form);
      setSuccess(`${t("add")} ${t("announcements")}`);
      setShowAdd(false); setForm({ title: "", message: "", published: false });
      await load();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/announcements/${id}`); await load(); }
    catch (err: any) { setError(err.message); }
  };

  const togglePublish = async (ann: any) => {
    try { await api.put(`/announcements/${ann.id}`, { published: !ann.published }); await load(); }
    catch (err: any) { setError(err.message); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("announcements")}</h2></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> {t("add")}</button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} className="flex-shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle2 size={16} className="flex-shrink-0" /><span className="flex-1">{success}</span><button onClick={() => setSuccess("")}><X size={14} /></button></div>}

      {items.length === 0 ? <div className="card text-center py-12 text-sm text-slate-400">{t("noData")}</div> : (
        <div className="space-y-3">
          {items.map((ann) => (
            <div key={ann.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell size={15} className="text-brand-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-900">{ann.title}</span>
                    <span className={`badge ${ann.published ? "badge-green" : "badge-gray"}`}>{ann.published ? t("enabled") : t("disabled")}</span>
                  </div>
                  <p className="text-sm text-slate-600 ml-5">{ann.message}</p>
                  <p className="text-xs text-slate-400 mt-1 ml-5">{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : "-"}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="btn btn-sm btn-secondary" onClick={() => togglePublish(ann)}>
                    <Pencil size={13} />{ann.published ? t("disabled") : t("enabled")}
                  </button>
                  <ConfirmButton className="btn btn-sm btn-danger" message={t("deleteConfirm")} onConfirm={() => handleDelete(ann.id)}><Trash2 size={13} /></ConfirmButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <ModalShell title={<>{t("add")} {t("announcements")}</>} onClose={() => setShowAdd(false)}>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><label className="form-label">Title / العنوان *</label><input className="form-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
              <div><label className="form-label">Message / الرسالة *</label><textarea className="form-input" rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required /></div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Publish immediately / نشر فوراً</label>
                <label className="toggle"><input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} /><span className="toggle-slider" /></label>
              </div>
              <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t("cancel")}</button><button type="submit" className="btn btn-primary">{t("save")}</button></div>
            </form>
        </ModalShell>
      )}
    </div>
  );
}
