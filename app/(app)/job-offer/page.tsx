"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText, Plus, Printer, Save, Trash2, ArrowRight, AlertTriangle, CheckCircle2,
  Upload, Settings, MousePointer2, X,
} from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// A field placed over the contract image. Positions are percentages of the image box.
type Field = { id: string; label: string; x: number; y: number; w: number; size: number };
type Template = { id: number; image: string; fields: Field[] };

const uid = () => Math.random().toString(36).slice(2, 9);

export default function JobOfferPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [tpl, setTpl] = useState<Template | null | undefined>(undefined); // undefined = loading
  const [offers, setOffers] = useState<any[]>([]);
  const [view, setView] = useState<"list" | "designer" | "fill">("list");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Designer state
  const [dImage, setDImage] = useState("");
  const [dFields, setDFields] = useState<Field[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  // Fill state
  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setError("");
    try {
      const [t, o] = await Promise.all([
        api.get("/job-offers/template"),
        api.get("/job-offers"),
      ]);
      const data = t.data;
      setTpl(data ? { ...data, fields: Array.isArray(data.fields) ? data.fields : [] } : null);
      setOffers(o.data || []);
    } catch (e: any) { setError(e.message); setTpl(null); }
  };

  const flash = (m: string) => { setSuccess(m); setTimeout(() => setSuccess(""), 2500); };

  // ── Designer ──────────────────────────────────────────────────────────────
  const openDesigner = () => {
    setDImage(tpl?.image || "");
    setDFields(tpl?.fields ? JSON.parse(JSON.stringify(tpl.fields)) : []);
    setSelected(null);
    setError("");
    setView("designer");
  };

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError(ar ? "ارفع صورة (PNG/JPG)" : "Upload an image"); return; }
    if (f.size > 5 * 1024 * 1024) { setError(ar ? "الصورة أكبر من 5MB" : "Image exceeds 5MB"); return; }
    const data = await new Promise<string>((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f);
    });
    setDImage(data);
  };

  const addField = () => {
    const f: Field = { id: uid(), label: ar ? "حقل جديد" : "New field", x: 38, y: 45, w: 28, size: 13 };
    setDFields((p) => [...p, f]);
    setSelected(f.id);
  };
  const updateField = (id: string, patch: Partial<Field>) =>
    setDFields((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeField = (id: string) => {
    setDFields((p) => p.filter((f) => f.id !== id));
    if (selected === id) setSelected(null);
  };

  const onFieldPointerDown = (e: React.PointerEvent, f: Field) => {
    e.preventDefault();
    setSelected(f.id);
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    drag.current = { id: f.id, dx: px - f.x, dy: py - f.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onStagePointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const d = drag.current;
    updateField(d.id, {
      x: Math.max(0, Math.min(98, px - d.dx)),
      y: Math.max(0, Math.min(99, py - d.dy)),
    });
  };
  const onStagePointerUp = () => { drag.current = null; };

  const saveTemplate = async () => {
    if (!dImage) { setError(ar ? "ارفع صورة العقد أولاً" : "Upload the contract image first"); return; }
    setSaving(true); setError("");
    try {
      const r = await api.put("/job-offers/template", { image: dImage, fields: dFields });
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

  // ── Fill ──────────────────────────────────────────────────────────────────
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
    const name = tpl.fields.map((f) => values[f.id]).find((v) => v && v.trim()) || "";
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

  const selField = dFields.find((f) => f.id === selected) || null;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (tpl === undefined) {
    return <div className="flex items-center justify-center py-20 gap-2 text-slate-400"><span className="spinner spinner-dark w-5 h-5" />{ar ? "جاري التحميل..." : "Loading..."}</div>;
  }

  // ── No template yet → onboarding upload ─────────────────────────────────────
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
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {ar ? "ارفع صورة نموذج عقد/عرض التدريب الخاص بشركتك مرة واحدة، وحدّد أماكن الحقول اللي بتتعبّى، وبعدها كل عرض جديد بيفتح على عقدكم جاهز للتعبئة." : "Upload your company's training-offer document once, place the fillable fields, then every new offer opens on your own contract."}
          </p>
          <button className="btn btn-primary gap-2 mx-auto" onClick={openDesigner}><Upload size={16} />{ar ? "رفع العقد" : "Upload contract"}</button>
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
            <button className="btn btn-secondary btn-sm gap-2" onClick={openDesigner}><Settings size={14} />{ar ? "تعديل القالب" : "Edit template"}</button>
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

  // ── Designer ──────────────────────────────────────────────────────────────
  if (view === "designer") {
    return (
      <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <button className="btn btn-secondary gap-2" onClick={() => setView("list")}>
            <ArrowRight size={15} className={ar ? "" : "rotate-180"} />{ar ? "رجوع" : "Back"}
          </button>
          <div className="flex items-center gap-2">
            {tpl && <button className="btn btn-danger btn-sm gap-2" onClick={deleteTemplate}><Trash2 size={14} />{ar ? "حذف القالب" : "Delete"}</button>}
            <label className="btn btn-secondary gap-2 cursor-pointer"><Upload size={15} />{dImage ? (ar ? "تغيير الصورة" : "Change image") : (ar ? "رفع صورة" : "Upload image")}<input type="file" accept="image/*" className="hidden" onChange={pickImage} /></label>
            <button className="btn btn-primary gap-2" onClick={saveTemplate} disabled={saving}>{saving ? <span className="spinner" /> : <Save size={15} />}{ar ? "حفظ القالب" : "Save template"}</button>
          </div>
        </div>

        {error && <div className="no-print alert alert-error"><AlertTriangle size={16} />{error}</div>}

        {!dImage ? (
          <div className="card text-center py-16 text-slate-400">
            <Upload size={32} className="mx-auto mb-3 opacity-40" />
            {ar ? "ارفع صورة العقد لتبدأ بتحديد الحقول" : "Upload the contract image to start placing fields"}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* Stage */}
            <div className="card p-2 overflow-auto">
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5 no-print"><MousePointer2 size={13} />{ar ? "اسحب الحقول لمكانها فوق العقد" : "Drag fields onto the contract"}</div>
              <div
                ref={stageRef}
                className="relative w-full select-none"
                onPointerMove={onStagePointerMove}
                onPointerUp={onStagePointerUp}
                onPointerLeave={onStagePointerUp}
              >
                <img src={dImage} alt="" className="w-full block pointer-events-none" />
                {dFields.map((f) => (
                  <div
                    key={f.id}
                    onPointerDown={(e) => onFieldPointerDown(e, f)}
                    className={`absolute cursor-move rounded border-2 bg-brand-50/70 ${selected === f.id ? "border-brand-600" : "border-brand-300"} flex items-center px-1`}
                    style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.size + 8}px` }}
                    title={f.label}
                  >
                    <span className="truncate text-brand-700 font-medium" style={{ fontSize: f.size }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Side panel */}
            <div className="card h-fit no-print">
              <button className="btn btn-primary btn-sm w-full gap-2 mb-3" onClick={addField}><Plus size={14} />{ar ? "إضافة حقل" : "Add field"}</button>
              {dFields.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-6">{ar ? "لا حقول بعد" : "No fields yet"}</div>
              ) : (
                <div className="space-y-2">
                  {dFields.map((f) => (
                    <div key={f.id} className={`p-2 rounded-lg border ${selected === f.id ? "border-brand-400 bg-brand-50/50" : "border-slate-200"}`} onClick={() => setSelected(f.id)}>
                      <div className="flex items-center gap-1">
                        <input className="form-input text-sm flex-1" value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} />
                        <button className="text-slate-300 hover:text-rose-500 p-1" onClick={() => removeField(f.id)}><Trash2 size={14} /></button>
                      </div>
                      {selected === f.id && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <label className="text-[11px] text-slate-500">{ar ? "العرض %" : "Width %"}<input type="number" className="form-input text-sm" value={f.w} onChange={(e) => updateField(f.id, { w: Number(e.target.value) })} /></label>
                          <label className="text-[11px] text-slate-500">{ar ? "حجم الخط" : "Font px"}<input type="number" className="form-input text-sm" value={f.size} onChange={(e) => updateField(f.id, { size: Number(e.target.value) })} /></label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Fill ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button className="btn btn-secondary gap-2" onClick={() => setView("list")}>
          <ArrowRight size={15} className={ar ? "" : "rotate-180"} />{ar ? "رجوع" : "Back"}
        </button>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary gap-2" onClick={() => window.print()}><Printer size={15} />{ar ? "طباعة" : "Print"}</button>
          <button className="btn btn-primary gap-2" onClick={saveOffer} disabled={saving}>{saving ? <span className="spinner" /> : <Save size={15} />}{ar ? "حفظ" : "Save"}</button>
        </div>
      </div>

      {error && <div className="no-print alert alert-error"><AlertTriangle size={16} />{error}</div>}
      {success && <div className="no-print alert alert-success"><CheckCircle2 size={16} />{success}</div>}

      <div id="print-area" className="mx-auto max-w-[820px] bg-white">
        <div className="relative w-full">
          <img src={tpl?.image} alt="" className="w-full block" />
          {tpl?.fields.map((f) => (
            <input
              key={f.id}
              value={values[f.id] || ""}
              onChange={(e) => setValues((p) => ({ ...p, [f.id]: e.target.value }))}
              placeholder={f.label}
              className="absolute bg-transparent outline-none border-b border-brand-300/60 focus:border-brand-600 text-slate-900 px-1 print:border-none print:placeholder-transparent"
              style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, fontSize: f.size }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
