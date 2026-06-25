"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText, Plus, Printer, Save, Trash2, ArrowRight, AlertTriangle, CheckCircle2,
  Upload, Settings, FileDown, FileType2,
} from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  fileToDataUri, extractPlaceholders, autoMarkTemplate, renderDocx, downloadBlob, renderDocxToElement,
} from "@/lib/docx";

// A detected placeholder: `key` is the exact {{text}}; `label` is the display name.
type Field = { key: string; label: string };
type Template = { id: number; image: string; fields: Field[] };

const DOCX_EXT = /\.docx$/i;

export default function JobOfferPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [tpl, setTpl] = useState<Template | null | undefined>(undefined);
  const [offers, setOffers] = useState<any[]>([]);
  const [view, setView] = useState<"list" | "editor" | "fill">("list");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");

  // Editor state (uploading / reviewing the Word template)
  const [eFile, setEFile] = useState("");      // data URI of uploaded .docx
  const [eName, setEName] = useState("");       // original filename
  const [eFields, setEFields] = useState<Field[]>([]);

  // Fill state
  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setError("");
    try {
      const [t, o] = await Promise.all([
        api.get("/job-offers/template"),
        api.get("/job-offers"),
      ]);
      const d = t.data;
      setTpl(d ? { ...d, fields: Array.isArray(d.fields) ? d.fields : [] } : null);
      setOffers(o.data || []);
    } catch (e: any) { setError(e.message); setTpl(null); }
  };

  const flash = (m: string) => { setSuccess(m); setTimeout(() => setSuccess(""), 2500); };

  // ── Editor (upload + detect placeholders) ───────────────────────────────────
  const openEditor = () => {
    setEFile(tpl?.image || "");
    setEName(tpl ? (ar ? "القالب الحالي" : "Current template") : "");
    setEFields(tpl?.fields ? [...tpl.fields] : []);
    setError("");
    setView("editor");
  };

  const pickDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!DOCX_EXT.test(f.name)) { setError(ar ? "ارفع ملف Word بصيغة .docx" : "Upload a .docx Word file"); return; }
    if (f.size > 8 * 1024 * 1024) { setError(ar ? "الملف أكبر من 8MB" : "File exceeds 8MB"); return; }
    setError(""); setBusy(ar ? "جاري تحليل الملف..." : "Analyzing file...");
    try {
      const uri = await fileToDataUri(f);
      // 1) Use manual {{...}} markers if the file already has them.
      const keys = await extractPlaceholders(uri);
      if (keys.length > 0) {
        setEFile(uri);
        setEName(f.name);
        setEFields(keys.map((k) => ({ key: k, label: k })));
      } else {
        // 2) Otherwise auto-detect empty table cells and mark them.
        const { dataUri, fields } = await autoMarkTemplate(uri);
        setEFile(dataUri);
        setEName(f.name);
        setEFields(fields);
        if (fields.length === 0) setError(ar ? "ما قدرت ألاقي خانات فاضية للتعبئة. لو عقدك مش جدول، حُط علامات زي {{الاسم}} مكان البيانات." : "No fillable cells found. Add {{...}} markers where data goes.");
      }
    } catch (err: any) {
      setError(ar ? "تعذّر قراءة الملف — تأكد إنه .docx صالح" : "Could not read the file");
    } finally { setBusy(""); }
  };

  const saveTemplate = async () => {
    if (!eFile) { setError(ar ? "ارفع ملف العقد أولاً" : "Upload the contract file first"); return; }
    setSaving(true); setError("");
    try {
      const r = await api.put("/job-offers/template", { image: eFile, fields: eFields });
      setTpl({ ...r.data, fields: Array.isArray(r.data.fields) ? r.data.fields : [] });
      flash(ar ? "تم حفظ القالب" : "Template saved");
      setView("list");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deleteTemplate = async () => {
    if (!confirm(ar ? "حذف القالب؟ سيتطلب رفع عقد جديد." : "Delete the template?")) return;
    try { await api.delete("/job-offers/template"); setTpl(null); setView("list"); }
    catch (e: any) { setError(e.message); }
  };

  // ── Fill ────────────────────────────────────────────────────────────────────
  const newOffer = () => { setValues({}); setEditingId(null); setError(""); setView("fill"); };
  const openOffer = async (id: number) => {
    setError("");
    try {
      const r = await api.get(`/job-offers/${id}`);
      setValues((r.data?.values as Record<string, string>) || {});
      setEditingId(id);
      setView("fill");
    } catch (e: any) { setError(e.message); }
  };

  const saveOffer = async () => {
    if (!tpl) return;
    setSaving(true); setError("");
    const name = tpl.fields.map((f) => values[f.key]).find((v) => v && v.trim()) || "";
    try {
      if (editingId) await api.put(`/job-offers/${editingId}`, { name, values });
      else { const r = await api.post("/job-offers", { name, values }); setEditingId(r.data?.id ?? null); }
      flash(ar ? "تم حفظ العرض" : "Offer saved");
      const o = await api.get("/job-offers"); setOffers(o.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const removeOffer = async (id: number) => {
    if (!confirm(ar ? "حذف هذا العرض؟" : "Delete this offer?")) return;
    try { await api.delete(`/job-offers/${id}`); setOffers((p) => p.filter((o) => o.id !== id)); }
    catch (e: any) { setError(e.message); }
  };

  const offerFileName = () => {
    const nm = (tpl?.fields.map((f) => values[f.key]).find((v) => v && v.trim()) || "offer").replace(/[\\/:*?"<>|]/g, "").slice(0, 40);
    return `عرض-تدريب-${nm}`;
  };

  // Download the filled Word document.
  const downloadWord = async () => {
    if (!tpl) return;
    setBusy(ar ? "جاري توليد Word..." : "Generating Word...");
    try {
      const blob = await renderDocx(tpl.image, values);
      downloadBlob(blob, `${offerFileName()}.docx`);
    } catch (e: any) { setError(ar ? "تعذّر توليد الملف" : "Generation failed"); }
    finally { setBusy(""); }
  };

  // Render to the print area, then open the browser print dialog (Save as PDF).
  const exportPdf = async () => {
    if (!tpl || !printRef.current) return;
    setBusy(ar ? "جاري تجهيز PDF..." : "Preparing PDF...");
    try {
      const blob = await renderDocx(tpl.image, values);
      await renderDocxToElement(blob, printRef.current);
      setBusy("");
      setTimeout(() => window.print(), 200);
    } catch (e: any) { setError(ar ? "تعذّر تجهيز PDF" : "PDF failed"); setBusy(""); }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (tpl === undefined) {
    return <div className="flex items-center justify-center py-20 gap-2 text-slate-400"><span className="spinner spinner-dark w-5 h-5" />{ar ? "جاري التحميل..." : "Loading..."}</div>;
  }

  // ── No template yet → onboarding ────────────────────────────────────────────
  if (view === "list" && !tpl) {
    return (
      <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
        <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
          <FileText className="text-brand-600" size={22} />
          <h2 className="text-xl font-bold text-slate-800">{ar ? "عروض التدريب" : "Training Offers"}</h2>
        </div>
        {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
        <div className="card text-center py-14">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4"><Upload size={28} /></div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">{ar ? "ابدأ بإعداد عقد شركتك" : "Set up your company contract"}</h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto mb-3">
            {ar ? "ارفع ملف Word لعقد التدريب الخاص بشركتك. حُط داخله علامات بين قوسين مزدوجين مكان البيانات اللي بتتغيّر، مثلاً:" : "Upload your company's training-offer Word file with double-brace placeholders, e.g.:"}
          </p>
          <div className="inline-block text-sm font-mono bg-slate-100 text-slate-700 rounded-lg px-4 py-2 mb-6 dir-ltr" dir="ltr">{"الاسم: {{الاسم}}  ·  التاريخ: {{التاريخ}}  ·  الراتب: {{الراتب}}"}</div>
          <div>
            <button className="btn btn-primary gap-2 mx-auto" onClick={openEditor}><Upload size={16} />{ar ? "رفع ملف Word" : "Upload Word file"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── List ────────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FileText className="text-brand-600" size={22} />
            <h2 className="text-xl font-bold text-slate-800">{ar ? "عروض التدريب" : "Training Offers"}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary btn-sm gap-2" onClick={openEditor}><Settings size={14} />{ar ? "تعديل القالب" : "Edit template"}</button>
            <button className="btn btn-primary gap-2" onClick={newOffer}><Plus size={15} />{ar ? "عرض جديد" : "New Offer"}</button>
          </div>
        </div>

        {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
        {success && <div className="alert alert-success"><CheckCircle2 size={16} />{success}</div>}

        <div className="card overflow-hidden">
          {offers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              {ar ? "لا توجد عروض محفوظة" : "No saved offers yet"}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {offers.map((o) => (
                <div key={o.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {(o.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{o.name || (ar ? "بدون اسم" : "Unnamed")}</div>
                    <div className="text-xs text-slate-400 truncate">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => openOffer(o.id)}>{ar ? "فتح" : "Open"}</button>
                  <button className="text-slate-300 hover:text-rose-500" onClick={() => removeOffer(o.id)} title={ar ? "حذف" : "Delete"}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Editor ──────────────────────────────────────────────────────────────────
  if (view === "editor") {
    return (
      <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className="btn btn-secondary gap-2" onClick={() => setView("list")}>
            <ArrowRight size={15} className={ar ? "" : "rotate-180"} />{ar ? "رجوع" : "Back"}
          </button>
          <div className="flex items-center gap-2">
            {tpl && <button className="btn btn-danger btn-sm gap-2" onClick={deleteTemplate}><Trash2 size={14} />{ar ? "حذف القالب" : "Delete"}</button>}
            <label className="btn btn-secondary gap-2 cursor-pointer"><Upload size={15} />{eFile ? (ar ? "تغيير الملف" : "Change file") : (ar ? "رفع ملف Word" : "Upload Word")}<input type="file" accept=".docx" className="hidden" onChange={pickDocx} /></label>
            <button className="btn btn-primary gap-2" onClick={saveTemplate} disabled={saving || !eFile}>{saving ? <span className="spinner" /> : <Save size={15} />}{ar ? "حفظ القالب" : "Save template"}</button>
          </div>
        </div>

        {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
        {busy && <div className="alert alert-info"><span className="spinner spinner-dark w-4 h-4" />{busy}</div>}

        <div className="card">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"><FileType2 size={20} /></div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate">{eName || (ar ? "لم يتم رفع ملف" : "No file uploaded")}</div>
              <div className="text-xs text-slate-400">{eFile ? (ar ? `${eFields.length} علامة تم اكتشافها` : `${eFields.length} placeholders detected`) : (ar ? "ارفع ملف Word فيه علامات {{...}}" : "Upload a .docx with {{...}} placeholders")}</div>
            </div>
          </div>

          {eFields.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-8">{ar ? "لا توجد علامات بعد" : "No placeholders yet"}</div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700 mb-2">{ar ? "العلامات المكتشفة (تقدر تسمّيها باسم واضح للتعبئة):" : "Detected placeholders (rename for clearer labels):"}</div>
              {eFields.map((f, i) => (
                <div key={f.key} className="flex items-center gap-3">
                  {!/^f\d+$/.test(f.key) && <code className="text-xs bg-slate-100 text-brand-700 rounded px-2 py-1.5 flex-shrink-0 min-w-[120px] text-center" dir="ltr">{`{{${f.key}}}`}</code>}
                  <span className="text-slate-400 text-xs flex-shrink-0">{ar ? `حقل ${i + 1}` : `Field ${i + 1}`}</span>
                  <span className="text-slate-300">→</span>
                  <input className="form-input flex-1" value={f.label} onChange={(e) => setEFields((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder={ar ? "اسم الحقل" : "Field label"} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Fill ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button className="btn btn-secondary gap-2" onClick={() => setView("list")}>
          <ArrowRight size={15} className={ar ? "" : "rotate-180"} />{ar ? "رجوع" : "Back"}
        </button>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary gap-2" onClick={downloadWord} disabled={!!busy}><FileDown size={15} />{ar ? "تنزيل Word" : "Word"}</button>
          <button className="btn btn-secondary gap-2" onClick={exportPdf} disabled={!!busy}><Printer size={15} />PDF</button>
          <button className="btn btn-primary gap-2" onClick={saveOffer} disabled={saving}>{saving ? <span className="spinner" /> : <Save size={15} />}{ar ? "حفظ" : "Save"}</button>
        </div>
      </div>

      {error && <div className="no-print alert alert-error"><AlertTriangle size={16} />{error}</div>}
      {success && <div className="no-print alert alert-success"><CheckCircle2 size={16} />{success}</div>}
      {busy && <div className="no-print alert alert-info"><span className="spinner spinner-dark w-4 h-4" />{busy}</div>}

      <div className="no-print card">
        {tpl?.fields.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-8">{ar ? "القالب ما فيه علامات للتعبئة — عدّل القالب وأضف علامات {{...}}" : "Template has no placeholders"}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tpl?.fields.map((f) => (
              <div key={f.key}>
                <label className="form-label">{f.label}</label>
                <input className="form-input" value={values[f.key] || ""} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))} dir="auto" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print/preview target — populated on demand by exportPdf */}
      <div id="print-area" ref={printRef} className="bg-white" />
    </div>
  );
}
