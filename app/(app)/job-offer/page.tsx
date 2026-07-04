"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText, Plus, Printer, Save, Trash2, ArrowRight, AlertTriangle, CheckCircle2,
  Upload, Settings, FileDown, FileType2, FileSpreadsheet,
} from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  fileToDataUri, extractPlaceholders, autoMarkTemplate, renderDocx, downloadBlob, renderDocxToElement,
} from "@/lib/docx";

// ── Built-in structured form field groups (saved to named JobOffer columns) ──
const PERSONAL = [
  { key: "name", label: "الاسم" }, { key: "nationality", label: "الجنسية" },
  { key: "phone1", label: "رقم الهاتف 1" }, { key: "phone2", label: "رقم الهاتف 2" },
  { key: "nationalId", label: "الرقم الوطني / رقم الجواز" }, { key: "qualifications", label: "المؤهلات" },
  { key: "experience", label: "الخبرة" }, { key: "offerDate", label: "تاريخ العرض" },
];
const TRAINING = [
  { key: "trainingTitle", label: "المسمى للتدريب" }, { key: "sector", label: "القطاع / الإدارة" },
  { key: "trainingHours", label: "ساعات التدريب" }, { key: "trainingPeriod", label: "فترة التدريب" },
  { key: "agreementDuration", label: "مدة اتفاقية التدريب" }, { key: "agreementType", label: "نوع الاتفاقية" },
  { key: "agreementConditions", label: "اشتراطات الاتفاقية" },
];
const ALL_KEYS = [
  ...PERSONAL.map((f) => f.key), ...TRAINING.map((f) => f.key),
  "grantFirst", "grantSecond", "noteSecond", "offerValidity", "joiningDate", "signatureDate", "fullName",
];
const AGREEMENT =
  "وعليه فأنا الموقع أدناه أوافق على العرض المقدم وفقاً للشروط والمميزات المذكورة جميعها أعلاه وأؤكد على صحة المعلومات المقدمة من قبلي لهذا العمل و/أو التدريب.";

const emptyForm = (): Record<string, string> => {
  const f: Record<string, string> = {};
  ALL_KEYS.forEach((k) => (f[k] = ""));
  f.offerValidity = "24 ساعة";
  return f;
};

type Field = { key: string; label: string };
type Template = { id: number; image: string; fields: Field[] };

const DOCX_EXT = /\.docx$/i;

export default function JobOfferPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [tpl, setTpl] = useState<Template | null | undefined>(undefined);
  const [offers, setOffers] = useState<any[]>([]);
  const [view, setView] = useState<"list" | "wordEditor" | "wordFill" | "formFill">("list");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Word template editor
  const [eFile, setEFile] = useState("");
  const [eName, setEName] = useState("");
  const [eFields, setEFields] = useState<Field[]>([]);
  // Word fill
  const [values, setValues] = useState<Record<string, string>>({});
  // Structured form
  const [form, setForm] = useState<Record<string, string>>(emptyForm());

  const printRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setError("");
    try {
      const [t, o] = await Promise.all([api.get("/job-offers/template"), api.get("/job-offers")]);
      const d = t.data;
      setTpl(d ? { ...d, fields: Array.isArray(d.fields) ? d.fields : [] } : null);
      setOffers(o.data || []);
    } catch (e: any) { setError(e.message); setTpl(null); }
  };
  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setSuccess(m); setTimeout(() => setSuccess(""), 2500); };
  const refreshOffers = async () => { const o = await api.get("/job-offers"); setOffers(o.data || []); };

  // ── Open an existing offer (route by kind) ──────────────────────────────────
  const openOffer = async (id: number) => {
    setError("");
    try {
      const r = await api.get(`/job-offers/${id}`);
      const d = r.data || {};
      setEditingId(id);
      if (d.kind === "word") {
        setValues((d.values as Record<string, string>) || {});
        setView("wordFill");
      } else {
        const f = emptyForm();
        ALL_KEYS.forEach((k) => (f[k] = d[k] ?? ""));
        setForm(f);
        setView("formFill");
      }
    } catch (e: any) { setError(e.message); }
  };
  const removeOffer = async (id: number) => {
    if (!confirm(ar ? "حذف هذا العرض؟" : "Delete this offer?")) return;
    try { await api.delete(`/job-offers/${id}`); setOffers((p) => p.filter((o) => o.id !== id)); }
    catch (e: any) { setError(e.message); }
  };

  // ── Structured form ─────────────────────────────────────────────────────────
  const newForm = () => { setForm(emptyForm()); setEditingId(null); setError(""); setView("formFill"); };
  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const saveForm = async () => {
    setSaving(true); setError("");
    try {
      if (editingId) await api.put(`/job-offers/${editingId}`, { kind: "form", ...form });
      else { const r = await api.post("/job-offers", { kind: "form", ...form }); setEditingId(r.data?.id ?? null); }
      flash(ar ? "تم حفظ العرض" : "Offer saved"); refreshOffers();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  // ── Word template editor ────────────────────────────────────────────────────
  const openWordEditor = () => {
    setEFile(tpl?.image || ""); setEName(tpl ? (ar ? "القالب الحالي" : "Current template") : "");
    setEFields(tpl?.fields ? [...tpl.fields] : []); setError(""); setView("wordEditor");
  };
  const pickDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!DOCX_EXT.test(f.name)) { setError(ar ? "ارفع ملف Word بصيغة .docx" : "Upload a .docx file"); return; }
    if (f.size > 8 * 1024 * 1024) { setError(ar ? "الملف أكبر من 8MB" : "File exceeds 8MB"); return; }
    setError(""); setBusy(ar ? "جاري تحليل الملف..." : "Analyzing...");
    try {
      const uri = await fileToDataUri(f);
      const keys = await extractPlaceholders(uri);
      if (keys.length > 0) { setEFile(uri); setEName(f.name); setEFields(keys.map((k) => ({ key: k, label: k }))); }
      else {
        const { dataUri, fields } = await autoMarkTemplate(uri);
        setEFile(dataUri); setEName(f.name); setEFields(fields);
        if (fields.length === 0) setError(ar ? "ما قدرت ألاقي خانات فاضية. حُط علامات زي {{الاسم}} مكان البيانات." : "No fillable cells found.");
      }
    } catch { setError(ar ? "تعذّر قراءة الملف" : "Could not read the file"); }
    finally { setBusy(""); }
  };
  const saveTemplate = async () => {
    if (!eFile) { setError(ar ? "ارفع ملف العقد أولاً" : "Upload the file first"); return; }
    setSaving(true); setError("");
    try {
      const r = await api.put("/job-offers/template", { image: eFile, fields: eFields });
      setTpl({ ...r.data, fields: Array.isArray(r.data.fields) ? r.data.fields : [] });
      flash(ar ? "تم حفظ القالب" : "Template saved"); setView("list");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };
  const deleteTemplate = async () => {
    if (!confirm(ar ? "حذف قالب الـ Word؟" : "Delete the Word template?")) return;
    try { await api.delete("/job-offers/template"); setTpl(null); setView("list"); }
    catch (e: any) { setError(e.message); }
  };

  // ── Word fill ───────────────────────────────────────────────────────────────
  const newWord = () => {
    if (!tpl) { openWordEditor(); return; }
    setValues({}); setEditingId(null); setError(""); setView("wordFill");
  };
  const saveWord = async () => {
    if (!tpl) return;
    setSaving(true); setError("");
    const name = tpl.fields.map((f) => values[f.key]).find((v) => v && v.trim()) || "";
    try {
      if (editingId) await api.put(`/job-offers/${editingId}`, { kind: "word", name, values });
      else { const r = await api.post("/job-offers", { kind: "word", name, values }); setEditingId(r.data?.id ?? null); }
      flash(ar ? "تم حفظ العرض" : "Offer saved"); refreshOffers();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };
  const offerFileName = () => {
    const nm = (tpl?.fields.map((f) => values[f.key]).find((v) => v && v.trim()) || "offer").replace(/[\\/:*?"<>|]/g, "").slice(0, 40);
    return `عرض-تدريب-${nm}`;
  };
  const downloadWord = async () => {
    if (!tpl) return;
    setBusy(ar ? "جاري توليد Word..." : "Generating Word...");
    try { const blob = await renderDocx(tpl.image, values); downloadBlob(blob, `${offerFileName()}.docx`); }
    catch { setError(ar ? "تعذّر توليد الملف" : "Generation failed"); }
    finally { setBusy(""); }
  };
  const exportPdf = async () => {
    if (!tpl || !printRef.current) return;
    setBusy(ar ? "جاري تجهيز PDF..." : "Preparing PDF...");
    try { const blob = await renderDocx(tpl.image, values); await renderDocxToElement(blob, printRef.current); setBusy(""); setTimeout(() => window.print(), 200); }
    catch { setError(ar ? "تعذّر تجهيز PDF" : "PDF failed"); setBusy(""); }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (tpl === undefined) {
    return <div className="flex items-center justify-center py-20 gap-2 text-slate-400"><span className="spinner spinner-dark w-5 h-5" />{ar ? "جاري التحميل..." : "Loading..."}</div>;
  }

  // ── List ────────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileText className="text-brand-600" size={22} />
            <h2 className="text-xl font-bold text-slate-800">{ar ? "العروض الوظيفية" : "Job Offers"}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="btn btn-primary gap-2" onClick={newForm}><Plus size={15} />{ar ? "عرض جديد (فورم)" : "New (form)"}</button>
            <button className="btn btn-secondary gap-2" onClick={newWord}><FileType2 size={15} />{ar ? "عرض من Word" : "From Word"}</button>
            <button className="btn btn-secondary btn-sm gap-2" onClick={openWordEditor} title={ar ? "قالب Word" : "Word template"}><Settings size={14} />{ar ? "قالب Word" : "Template"}</button>
          </div>
        </div>

        {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
        {success && <div className="alert alert-success"><CheckCircle2 size={16} />{success}</div>}

        <div className="card overflow-hidden">
          {offers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              {ar ? "لا توجد عروض محفوظة — ابدأ بعرض جديد" : "No saved offers yet"}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {offers.map((o) => (
                <div key={o.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
                    {o.kind === "word" ? <FileType2 size={16} /> : <FileSpreadsheet size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{o.name || (ar ? "بدون اسم" : "Unnamed")}</div>
                    <div className="text-xs text-slate-400 truncate">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 me-2">{o.kind === "word" ? "Word" : (ar ? "فورم" : "Form")}</span>
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""}
                    </div>
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

  // ── Word template editor ────────────────────────────────────────────────────
  if (view === "wordEditor") {
    return (
      <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className="btn btn-secondary gap-2" onClick={() => setView("list")}><ArrowRight size={15} className={ar ? "" : "rotate-180"} />{ar ? "رجوع" : "Back"}</button>
          <div className="flex items-center gap-2">
            {tpl && <button className="btn btn-danger btn-sm gap-2" onClick={deleteTemplate}><Trash2 size={14} />{ar ? "حذف القالب" : "Delete"}</button>}
            <label className="btn btn-secondary gap-2 cursor-pointer"><Upload size={15} />{eFile ? (ar ? "تغيير الملف" : "Change") : (ar ? "رفع Word" : "Upload")}<input type="file" accept=".docx" className="hidden" onChange={pickDocx} /></label>
            <button className="btn btn-primary gap-2" onClick={saveTemplate} disabled={saving || !eFile}>{saving ? <span className="spinner" /> : <Save size={15} />}{ar ? "حفظ القالب" : "Save"}</button>
          </div>
        </div>
        {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
        {busy && <div className="alert alert-info"><span className="spinner spinner-dark w-4 h-4" />{busy}</div>}
        <div className="card">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"><FileType2 size={20} /></div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate">{eName || (ar ? "لم يتم رفع ملف" : "No file")}</div>
              <div className="text-xs text-slate-400">{eFile ? (ar ? `${eFields.length} حقل` : `${eFields.length} fields`) : (ar ? "ارفع Word فيه علامات {{...}} أو جدول بخانات فاضية" : "Upload .docx")}</div>
            </div>
          </div>
          {eFields.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-8">{ar ? "لا حقول بعد" : "No fields yet"}</div>
          ) : (
            <div className="space-y-2">
              {eFields.map((f, i) => (
                <div key={f.key} className="flex items-center gap-3">
                  {!/^f\d+$/.test(f.key) && <code className="text-xs bg-slate-100 text-brand-700 rounded px-2 py-1.5 flex-shrink-0 min-w-[110px] text-center" dir="ltr">{`{{${f.key}}}`}</code>}
                  <span className="text-slate-400 text-xs flex-shrink-0">{ar ? `حقل ${i + 1}` : `Field ${i + 1}`}</span>
                  <span className="text-slate-300">→</span>
                  <input className="form-input flex-1" value={f.label} onChange={(e) => setEFields((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Word fill ───────────────────────────────────────────────────────────────
  if (view === "wordFill") {
    return (
      <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <button className="btn btn-secondary gap-2" onClick={() => setView("list")}><ArrowRight size={15} className={ar ? "" : "rotate-180"} />{ar ? "رجوع" : "Back"}</button>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary gap-2" onClick={downloadWord} disabled={!!busy}><FileDown size={15} />{ar ? "تنزيل Word" : "Word"}</button>
            <button className="btn btn-secondary gap-2" onClick={exportPdf} disabled={!!busy}><Printer size={15} />PDF</button>
            <button className="btn btn-primary gap-2" onClick={saveWord} disabled={saving}>{saving ? <span className="spinner" /> : <Save size={15} />}{ar ? "حفظ" : "Save"}</button>
          </div>
        </div>
        {error && <div className="no-print alert alert-error"><AlertTriangle size={16} />{error}</div>}
        {success && <div className="no-print alert alert-success"><CheckCircle2 size={16} />{success}</div>}
        {busy && <div className="no-print alert alert-info"><span className="spinner spinner-dark w-4 h-4" />{busy}</div>}
        <div className="no-print card">
          {tpl?.fields.length === 0 ? (
            <div className="text-center py-10">
              <FileType2 size={28} className="mx-auto mb-3 text-slate-300" />
              <div className="text-sm text-slate-500 mb-1 font-medium">{ar ? "قالب الـ Word هذا ما فيه أي خانات للتعبئة" : "This Word template has no fillable fields"}</div>
              <div className="text-xs text-slate-400 mb-5 max-w-md mx-auto">{ar ? "إمّا تعدّل القالب وتضيف علامات {{...}} أو خانات فاضية بجدول، أو تستخدم الفورم الجاهز اللي بتكتب فيه على الصفحة مباشرة." : "Edit the template to add {{...}} markers, or use the built-in form."}</div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button className="btn btn-primary gap-2" onClick={newForm}><Plus size={15} />{ar ? "استخدم الفورم الجاهز" : "Use the form"}</button>
                <button className="btn btn-secondary gap-2" onClick={openWordEditor}><Settings size={15} />{ar ? "تعديل قالب Word" : "Edit template"}</button>
              </div>
            </div>
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
        <div id="print-area" ref={printRef} className="bg-white" />
      </div>
    );
  }

  // ── Structured form (built-in, on-page) ─────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3" dir={ar ? "rtl" : "ltr"}>
        <button className="btn btn-secondary gap-2" onClick={() => setView("list")}><ArrowRight size={15} className={ar ? "" : "rotate-180"} />{ar ? "رجوع" : "Back"}</button>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary gap-2" onClick={() => window.print()}><Printer size={15} />{ar ? "طباعة" : "Print"}</button>
          <button className="btn btn-primary gap-2" onClick={saveForm} disabled={saving}>{saving ? <span className="spinner" /> : <Save size={15} />}{ar ? "حفظ" : "Save"}</button>
        </div>
      </div>
      {error && <div className="no-print alert alert-error"><AlertTriangle size={16} />{error}</div>}
      {success && <div className="no-print alert alert-success"><CheckCircle2 size={16} />{success}</div>}

      <div id="print-area" dir="rtl" className="mx-auto max-w-[820px] bg-white text-slate-900">
        <div className="border border-slate-800">
          <div className="text-center font-black text-lg py-2 border-b border-slate-800">عرض تدريب</div>
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <SectionHeader title="المعلومات الشخصية:" />
              {PERSONAL.map((f) => <FieldRow key={f.key} label={f.label} value={form[f.key]} onChange={setF(f.key)} />)}
              <SectionHeader title="تفاصيل التدريب:" />
              {TRAINING.map((f) => <FieldRow key={f.key} label={f.label} value={form[f.key]} onChange={setF(f.key)} />)}
              <SectionHeader title="المميزات والبدلات (فترة التدريب الأول):" />
              <FieldRow label="منحة التدريب (الفترة الأولية - أول شهرين)" value={form.grantFirst} onChange={setF("grantFirst")} />
              <SectionHeader title="المميزات والبدلات (فترة التدريب الثاني):" />
              <FieldRow label="منحة التدريب (الفترة الثانية - ثاني 10 أشهر)" value={form.grantSecond} onChange={setF("grantSecond")} />
              <FieldRow label="ملاحظة" value={form.noteSecond} onChange={setF("noteSecond")} />
              <SectionHeader title="الصلاحية:" />
              <FieldRow label="صلاحية العرض" value={form.offerValidity} onChange={setF("offerValidity")} />
              <FieldRow label="تاريخ الإنضمام" value={form.joiningDate} onChange={setF("joiningDate")} />
              <SectionHeader title="موافقة المتقدم:" />
              <tr><td colSpan={2} className="border border-slate-800 px-3 py-2 text-[12px] leading-relaxed font-semibold text-slate-800">{AGREEMENT}</td></tr>
              <FieldRow label="التوقيع / التاريخ:" value={form.signatureDate} onChange={setF("signatureDate")} headerStyle />
              <FieldRow label="الاسم الكامل" value={form.fullName} onChange={setF("fullName")} headerStyle />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <tr><td colSpan={2} className="border border-slate-800 px-3 py-1.5 font-bold text-white" style={{ backgroundColor: "#80AFCD" }}>{title}</td></tr>;
}

function FieldRow({ label, value, onChange, headerStyle = false }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; headerStyle?: boolean;
}) {
  return (
    <tr>
      <td className="border border-slate-800 px-3 py-1.5 font-bold w-[38%] align-middle" style={headerStyle ? { backgroundColor: "#80AFCD", color: "#fff" } : { backgroundColor: "#CAE6EF" }}>{label}</td>
      <td className="border border-slate-800 p-0 align-middle">
        <input type="text" value={value} onChange={onChange} className="w-full bg-transparent px-3 py-1.5 outline-none focus:bg-brand-50/40" />
      </td>
    </tr>
  );
}
