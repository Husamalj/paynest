"use client";

import { useEffect, useState } from "react";
import {
  FileText, Plus, Printer, Save, Trash2, ArrowRight, AlertTriangle, CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ── Field groups (keys match the JobOffer model / API) ──────────────────────
const PERSONAL = [
  { key: "name",           label: "الاسم" },
  { key: "nationality",    label: "الجنسية" },
  { key: "phone1",         label: "رقم الهاتف 1" },
  { key: "phone2",         label: "رقم الهاتف 2" },
  { key: "nationalId",     label: "الرقم الوطني / رقم الجواز" },
  { key: "qualifications", label: "المؤهلات" },
  { key: "experience",     label: "الخبرة" },
  { key: "offerDate",      label: "تاريخ العرض" },
];

const TRAINING = [
  { key: "trainingTitle",       label: "المسمى للتدريب" },
  { key: "sector",              label: "القطاع / الإدارة" },
  { key: "trainingHours",       label: "ساعات التدريب" },
  { key: "trainingPeriod",      label: "فترة التدريب" },
  { key: "agreementDuration",   label: "مدة اتفاقية التدريب" },
  { key: "agreementType",       label: "نوع الاتفاقية" },
  { key: "agreementConditions", label: "اشتراطات الاتفاقية" },
];

const ALL_KEYS = [
  ...PERSONAL.map((f) => f.key), ...TRAINING.map((f) => f.key),
  "grantFirst", "grantSecond", "noteSecond", "offerValidity", "joiningDate",
  "signatureDate", "fullName",
];

const DISCLAIMER =
  "يرجى العلم بأن طبيعة العمل في الشركة وإن كان يعتبر مريحاً جداً للبعض، فإنه للبعض الآخر قد يكون متعباً جسدياً ونفسياً لما قد يحتويه \" ضمن ضوابط قانون العمل \" على سبيل المثال لا الحصر من (زيارة المواقع، سفر، العمل ليلاً، العمل لساعات إضافية، ضغط العمل)، ونظراً لأن عمل الشركة مرتبط بقطاع المقاولات فإن طبيعة التواصل قد تكون جافة وقد تعلو نبرة الصوت تارة وغير ذلك من الظروف المعروفة لهذا القطاع، ولذلك فإن المتقدم يقر بقدراته الجسدية والنفسية للعمل بالشركة وتحمل ظروفه (وفق ضوابط قانون العمل).";
const AGREEMENT =
  "وعليه فأنا الموقع أدناه أوافق على العرض المقدم وفقاً للشروط والمميزات المذكورة جميعها أعلاه وأؤكد على صحة المعلومات المقدمة من قبلي لهذا العمل و/أو التدريب.";
const NOTE_FIRST = "ملاحظة: علماً أن يوم الدوام في المكتب 9 ساعات عمل.";

const emptyForm = (): Record<string, string> => {
  const f: Record<string, string> = {};
  ALL_KEYS.forEach((k) => (f[k] = ""));
  f.offerValidity = "24 ساعة";
  return f;
};

export default function JobOfferPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [view, setView] = useState<"list" | "form">("list");
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<Record<string, string>>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadOffers(); }, []);

  const loadOffers = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/job-offers");
      setOffers(res.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const newOffer = () => {
    setForm(emptyForm());
    setEditingId(null);
    setView("form");
  };

  const openOffer = async (id: number) => {
    setError("");
    try {
      const res = await api.get(`/job-offers/${id}`);
      const data = res.data || {};
      const f = emptyForm();
      ALL_KEYS.forEach((k) => (f[k] = data[k] ?? ""));
      setForm(f);
      setEditingId(id);
      setView("form");
    } catch (e: any) { setError(e.message); }
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (editingId) {
        await api.put(`/job-offers/${editingId}`, form);
      } else {
        const res = await api.post("/job-offers", form);
        setEditingId(res.data?.id ?? null);
      }
      setSuccess(ar ? "تم حفظ العرض" : "Offer saved");
      setTimeout(() => setSuccess(""), 2500);
      loadOffers();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm(ar ? "حذف هذا العرض؟" : "Delete this offer?")) return;
    try {
      await api.delete(`/job-offers/${id}`);
      loadOffers();
    } catch (e: any) { setError(e.message); }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  // ── List view ─────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FileText className="text-brand-600" size={22} />
            <h2 className="text-xl font-bold text-slate-800">{ar ? "عروض التدريب" : "Job Offers"}</h2>
          </div>
          <button className="btn btn-primary gap-2" onClick={newOffer}>
            <Plus size={15} />{ar ? "عرض جديد" : "New Offer"}
          </button>
        </div>

        {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
        {success && <div className="alert alert-success"><CheckCircle2 size={16} />{success}</div>}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <span className="spinner spinner-dark w-5 h-5" />{ar ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : offers.length === 0 ? (
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
                    <div className="text-xs text-slate-400 truncate">
                      {o.trainingTitle || "—"}{o.offerDate ? ` · ${o.offerDate}` : ""}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => openOffer(o.id)}>
                    {ar ? "فتح" : "Open"}
                  </button>
                  <button className="text-slate-300 hover:text-rose-500" onClick={() => remove(o.id)} title={ar ? "حذف" : "Delete"}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Form / document view ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar (not printed) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3" dir={ar ? "rtl" : "ltr"}>
        <button className="btn btn-secondary gap-2" onClick={() => setView("list")}>
          <ArrowRight size={15} className={ar ? "" : "rotate-180"} />{ar ? "رجوع" : "Back"}
        </button>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary gap-2" onClick={() => window.print()}>
            <Printer size={15} />{ar ? "طباعة" : "Print"}
          </button>
          <button className="btn btn-primary gap-2" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : <Save size={15} />}
            {ar ? "حفظ" : "Save"}
          </button>
        </div>
      </div>

      {error && <div className="no-print alert alert-error"><AlertTriangle size={16} />{error}</div>}
      {success && <div className="no-print alert alert-success"><CheckCircle2 size={16} />{success}</div>}

      {/* Printable document */}
      <div id="print-area" dir="rtl" className="mx-auto max-w-[820px] bg-white text-slate-900">
        <div className="border border-slate-800">
          {/* Header banner */}
          <div className="border-b border-slate-800">
            <img src="/job-offer/logo1.jpeg" alt="SANA" className="w-full block" />
          </div>
          <div className="text-center font-bold text-[13px] py-1.5 border-b border-slate-800">
            شركة سنا للصناعات الهندسية ذ.م.م سجل رقم 62263
          </div>
          <div className="text-center font-black text-lg py-2 border-b border-slate-800">عرض تدريب</div>

          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {/* 1. Personal info */}
              <SectionHeader title="المعلومات الشخصية:" />
              {PERSONAL.map((f) => (
                <FieldRow key={f.key} label={f.label} value={form[f.key]} onChange={set(f.key)} />
              ))}

              {/* 2. Training details */}
              <SectionHeader title="تفاصيل التدريب:" />
              {TRAINING.map((f) => (
                <FieldRow key={f.key} label={f.label} value={form[f.key]} onChange={set(f.key)} />
              ))}

              {/* 3. Benefits — first period */}
              <SectionHeader title="المميزات والبدلات (فترة التدريب الأول):" />
              <FieldRow label="منحة التدريب (الفترة الأولية - أول شهرين)" value={form.grantFirst} onChange={set("grantFirst")} />
              <tr>
                <td colSpan={2} className="border border-slate-800 px-3 py-1.5 text-[12px] text-slate-700">
                  {NOTE_FIRST}
                </td>
              </tr>

              {/* 4. Benefits — second period */}
              <SectionHeader title="المميزات والبدلات (فترة التدريب الثاني):" />
              <FieldRow label="منحة التدريب (الفترة الثانية - ثاني 10 أشهر)" value={form.grantSecond} onChange={set("grantSecond")} />
              <FieldRow label="ملاحظة" value={form.noteSecond} onChange={set("noteSecond")} />

              {/* 5. Validity */}
              <SectionHeader title="الصلاحية:" />
              <FieldRow label="صلاحية العرض" value={form.offerValidity} onChange={set("offerValidity")} />
              <FieldRow label="تاريخ الإنضمام" value={form.joiningDate} onChange={set("joiningDate")} />

              {/* 6. Applicant approval */}
              <SectionHeader title="موافقة المتقدم:" />
              <tr>
                <td colSpan={2} className="border border-slate-800 px-3 py-2 text-[12px] leading-relaxed text-slate-700">
                  {DISCLAIMER}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-slate-800 px-3 py-2 text-[12px] leading-relaxed font-semibold text-slate-800">
                  {AGREEMENT}
                </td>
              </tr>
              <FieldRow label="التوقيع / التاريخ:" value={form.signatureDate} onChange={set("signatureDate")} headerStyle />
              <FieldRow label="الاسم الكامل" value={form.fullName} onChange={set("fullName")} headerStyle />
            </tbody>
          </table>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-800 text-[11px] text-slate-600">
            <span>HR-0117-Rev2</span>
            <span>Page 1 | 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Document building blocks ────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <tr>
      <td colSpan={2} className="border border-slate-800 px-3 py-1.5 font-bold text-white" style={{ backgroundColor: "#80AFCD" }}>
        {title}
      </td>
    </tr>
  );
}

function FieldRow({
  label, value, onChange, headerStyle = false,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  headerStyle?: boolean;
}) {
  return (
    <tr>
      <td
        className="border border-slate-800 px-3 py-1.5 font-bold w-[38%] align-middle"
        style={headerStyle ? { backgroundColor: "#80AFCD", color: "#fff" } : { backgroundColor: "#CAE6EF" }}
      >
        {label}
      </td>
      <td className="border border-slate-800 p-0 align-middle">
        <input
          type="text"
          value={value}
          onChange={onChange}
          className="w-full bg-transparent px-3 py-1.5 outline-none focus:bg-brand-50/40"
        />
      </td>
    </tr>
  );
}
