"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users, Plus, AlertTriangle, CheckCircle2, X, Shield, Edit2, Trash2,
  Calendar, Phone, Mail, Hash, Upload, FileText, CheckCircle, ChevronRight, Crown, Eye,
} from "lucide-react";
import clsx from "clsx";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api, { apiPostForm } from "@/lib/api";

// True when the value is empty (phone optional) or a valid international number.
function phoneOk(phone: string) {
  if (!phone) return true;
  const v = phone.startsWith("+") ? phone : `+${phone}`;
  try { return isValidPhoneNumber(v); } catch { return false; }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const DOC_TYPES = [
  { key: "certificate",  ar: "شهادة / مؤهل",        en: "Certificate / Degree" },
  { key: "transcript",   ar: "كشف العلامات",          en: "Academic Transcript" },
  { key: "no_criminal",  ar: "عدم المحكومية",         en: "No Criminal Record" },
  { key: "health",       ar: "خلو من الأمراض",        en: "Health Certificate" },
];

// Strip everything but digits, then drop a leading trunk "0" so the stored
// number is clean E.164 (e.g. +962790000000, not +9620790000000).
function sanitizeLocal(v: string) {
  return v.replace(/\D/g, "").replace(/^0+/, "");
}

function PhoneInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  const dialMatch = COUNTRIES.find((c) => value.startsWith(c.dial));
  const [dialCode, setDialCode] = useState(dialMatch?.dial ?? "+962");
  const [local, setLocal] = useState(dialMatch ? value.slice(dialMatch.dial.length) : value);

  const handleDial = (d: string) => { setDialCode(d); onChange(local ? d + local : ""); };
  const handleLocal = (raw: string) => {
    const v = sanitizeLocal(raw);
    setLocal(v);
    onChange(v ? dialCode + v : "");
  };

  return (
    <div className="flex gap-2">
      <select className="form-input w-36 flex-shrink-0" value={dialCode} onChange={(e) => handleDial(e.target.value)}>
        {COUNTRIES.map((c) => <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>)}
      </select>
      <input type="tel" inputMode="numeric" maxLength={12} className={clsx("form-input flex-1", error && "border-rose-500 ring-1 ring-rose-500 focus:border-rose-500")} placeholder="7XXXXXXXX" value={local} onChange={(e) => handleLocal(e.target.value)} />
    </div>
  );
}

const emptyForm = { employee_id: "", name: "", email: "", phone: "", base_salary: "", allowance: "", job_title: "", nationality: "", gender: "", national_id: "", birth_date: "", social_security: false, religion: "", work_type: "standard", workdays: "", req_hours: "" };
const WEEKDAYS: { key: string; ar: string; en: string }[] = [
  { key: "Sat", ar: "السبت", en: "Sat" }, { key: "Sun", ar: "الأحد", en: "Sun" },
  { key: "Mon", ar: "الاثنين", en: "Mon" }, { key: "Tue", ar: "الثلاثاء", en: "Tue" },
  { key: "Wed", ar: "الأربعاء", en: "Wed" }, { key: "Thu", ar: "الخميس", en: "Thu" },
  { key: "Fri", ar: "الجمعة", en: "Fri" },
];

function ScheduleFields({ f, set, ar }: { f: any; set: (u: any) => void; ar: boolean }) {
  const days: string[] = f.workdays ? String(f.workdays).split(",").map((s: string) => s.trim()).filter(Boolean) : [];
  const fixed = f.work_type === "fixed";
  const dailyWage = f.work_type === "daily_wage";
  const toggle = (k: string) => {
    const next = days.includes(k) ? days.filter((d) => d !== k) : [...days, k];
    set({ workdays: WEEKDAYS.filter((w) => next.includes(w.key)).map((w) => w.key).join(",") });
  };
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:col-span-2">
      <div className="text-xs font-semibold text-slate-500">
        {ar ? "الدوام (اختياري — اتركه فاضي ليأخذ افتراضي الشركة)" : "Schedule (optional — leave empty to use company default)"}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="form-label">{ar ? "نوع الدوام" : "Work type"}</label>
          <select className="form-input" value={f.work_type} onChange={(e) => set({ work_type: e.target.value })}>
            <option value="standard">{ar ? "عادي (حسب الجدول)" : "Standard (by schedule)"}</option>
            <option value="fixed">{ar ? "ثابت / مُعفى (راتب كامل بدون خصم حضور)" : "Fixed / exempt (full salary, no attendance deduction)"}</option>
            <option value="daily_wage">{ar ? "مياومة (أجر عن أيام الحضور فقط)" : "Daily wage (paid only for attended days)"}</option>
          </select>
        </div>
        <div>
          <label className="form-label">{ar ? "عدد ساعات اليوم المطلوبة" : "Required hours/day"}</label>
          <input type="number" step="any" className="form-input" placeholder={ar ? "افتراضي الشركة" : "company default"}
            value={f.req_hours} onChange={(e) => set({ req_hours: e.target.value })} disabled={fixed} />
        </div>
      </div>
      <div className={fixed || dailyWage ? "opacity-40 pointer-events-none" : ""}>
        <label className="form-label">{ar ? "أيام الدوام" : "Work days"}</label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((w) => (
            <button key={w.key} type="button" onClick={() => toggle(w.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${days.includes(w.key) ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-200 hover:border-brand-400"}`}>
              {ar ? w.ar : w.en}
            </button>
          ))}
        </div>
      </div>
      {fixed && <div className="text-[11px] text-amber-600">{ar ? "موظف ثابت: راتبه كامل دائماً، الحضور للتسجيل فقط بدون أي خصم." : "Fixed employee: always full salary; attendance is recorded only, no deductions."}</div>}
      {dailyWage && <div className="text-[11px] text-sky-600">{ar ? "مياومة: خانة «الراتب الأساسي» = أجر اليوم الواحد. يأخذ أجراً عن كل يوم حضور (كامل إن أتمّ ساعاته، ناقص إن قصّر، إضافي إن زاد)، ولا أجر للأيام الغائبة، وبدون ضمان." : "Daily wage: the 'Base salary' field = the daily rate. Paid per attended day (full if hours met, less if short, extra if over); no pay for absent days; no social security."}</div>}
    </div>
  );
}

export default function EmployeesPage() {
  const { t, lang } = useLanguage();
  const ar = lang === "ar";
  const [employees, setEmployees] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [quotaError, setQuotaError] = useState("");  // friendly upgrade prompt
  const [phoneError, setPhoneError] = useState("");  // inline phone validation
  const [emailError, setEmailError] = useState("");  // inline email validation

  // Add modal multi-step
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [form, setForm] = useState({ ...emptyForm });
  const [createdEmpId, setCreatedEmpId] = useState("");
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [docUploading, setDocUploading] = useState(false);
  const [docProgress, setDocProgress] = useState<Record<string, boolean>>({});
  const [addPhoto, setAddPhoto] = useState("");      // base64 profile photo for the new employee
  const [lightbox, setLightbox] = useState("");       // image URL shown enlarged

  const toBase64 = (file: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file);
  });

  // Edit / Delete
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({ employee_id: "", name: "", email: "", phone: "", base_salary: "", allowance: "", job_title: "", nationality: "", gender: "", national_id: "", birth_date: "", social_security: false, religion: "", photo_url: "", work_type: "standard", workdays: "", req_hours: "" });

  // Existing employee documents
  const [empDocs, setEmpDocs] = useState<any[]>([]);

  // Bilingual dictionary for common religion values — typed in either language,
  // displayed in the current language. Falls back to the raw text if unknown.
  const RELIGION_DICT: { ar: string; en: string; keys: string[] }[] = [
    { ar: "مسلم", en: "Muslim", keys: ["muslim", "مسلم", "اسلام", "إسلام", "مسلمة"] },
    { ar: "مسيحي", en: "Christian", keys: ["christian", "مسيحي", "مسيحية", "نصراني"] },
    { ar: "يهودي", en: "Jewish", keys: ["jewish", "jew", "يهودي", "يهودية"] },
    { ar: "بوذي", en: "Buddhist", keys: ["buddhist", "بوذي", "بوذية"] },
    { ar: "هندوسي", en: "Hindu", keys: ["hindu", "هندوسي", "هندوسية"] },
    { ar: "درزي", en: "Druze", keys: ["druze", "درزي", "درزية"] },
    { ar: "بهائي", en: "Baha'i", keys: ["bahai", "baha'i", "بهائي"] },
    { ar: "بدون", en: "None", keys: ["none", "بدون", "لا يوجد", "غير محدد"] },
  ];
  const religionLabel = (value: string) => {
    if (!value) return ar ? "غير محدد" : "Not selected";
    const norm = value.trim().toLowerCase();
    const item = RELIGION_DICT.find((r) => r.keys.includes(norm));
    if (!item) return value; // unknown free-text → show as typed
    return ar ? item.ar : item.en;
  };

  // Bilingual dictionary for common nationalities (MENA + a few others).
  const NATIONALITY_DICT: { ar: string; en: string; keys: string[] }[] = [
    { ar: "أردني", en: "Jordanian", keys: ["jordanian", "اردني", "أردني", "اردنية", "أردنية"] },
    { ar: "سعودي", en: "Saudi", keys: ["saudi", "سعودي", "سعودية"] },
    { ar: "إماراتي", en: "Emirati", keys: ["emirati", "اماراتي", "إماراتي"] },
    { ar: "كويتي", en: "Kuwaiti", keys: ["kuwaiti", "كويتي"] },
    { ar: "قطري", en: "Qatari", keys: ["qatari", "قطري"] },
    { ar: "بحريني", en: "Bahraini", keys: ["bahraini", "بحريني"] },
    { ar: "عماني", en: "Omani", keys: ["omani", "عماني", "عُماني"] },
    { ar: "مصري", en: "Egyptian", keys: ["egyptian", "مصري", "مصرية"] },
    { ar: "فلسطيني", en: "Palestinian", keys: ["palestinian", "فلسطيني", "فلسطينية"] },
    { ar: "لبناني", en: "Lebanese", keys: ["lebanese", "لبناني"] },
    { ar: "سوري", en: "Syrian", keys: ["syrian", "سوري", "سورية"] },
    { ar: "عراقي", en: "Iraqi", keys: ["iraqi", "عراقي"] },
    { ar: "يمني", en: "Yemeni", keys: ["yemeni", "يمني"] },
    { ar: "سوداني", en: "Sudanese", keys: ["sudanese", "سوداني"] },
    { ar: "مغربي", en: "Moroccan", keys: ["moroccan", "مغربي"] },
    { ar: "تونسي", en: "Tunisian", keys: ["tunisian", "تونسي"] },
    { ar: "جزائري", en: "Algerian", keys: ["algerian", "جزائري"] },
    { ar: "تركي", en: "Turkish", keys: ["turkish", "تركي"] },
    { ar: "هندي", en: "Indian", keys: ["indian", "هندي"] },
    { ar: "باكستاني", en: "Pakistani", keys: ["pakistani", "باكستاني"] },
    { ar: "فلبيني", en: "Filipino", keys: ["filipino", "فلبيني"] },
  ];
  const nationalityLabel = (value: string) => {
    if (!value) return "";
    const norm = value.trim().toLowerCase();
    const item = NATIONALITY_DICT.find((r) => r.keys.includes(norm));
    if (!item) return value;
    return ar ? item.ar : item.en;
  };

  // One field that covers locals (national ID) and non-locals (document/serial no.)
  const idFieldLabel = () => (ar ? "الرقم الوطني / رقم الوثيقة" : "National ID / Document No.");

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

  const loadDocs = async (empId: string) => {
    try {
      const res = await api.get(`/employees/${empId}/documents`);
      setEmpDocs(res.data || []);
    } catch { setEmpDocs([]); }
  };

  useEffect(() => { loadEmployees(); }, []);
  useEffect(() => { if (selectedId) loadDocs(selectedId); }, [selectedId]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? employees
      : employees.filter((e) =>
          String(e.employee_id || "").toLowerCase().includes(q) ||
          String(e.name || "").toLowerCase().includes(q) ||
          String(e.email || "").toLowerCase().includes(q)
        );
    // Order strictly by employee ID (numeric when possible, e.g. 240, 243, 247…)
    return [...list].sort((a, b) => {
      const na = Number(a.employee_id), nb = Number(b.employee_id);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.employee_id || "").localeCompare(String(b.employee_id || ""));
    });
  }, [employees, search]);

  const selectedEmployee = employees.find((e) => e.employee_id === selectedId) || null;
  const selectedBalance = balances.find((b) => b.employee_id === selectedId) || null;

  // Step 1: create employee
  const handleAddStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.name || !form.email || !form.base_salary) { setError(t("fillRequired")); return; }
    // Inline contact validation before submitting
    if (!EMAIL_RE.test(form.email)) {
      setEmailError(ar ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format");
      return;
    }
    setEmailError("");
    if (!phoneOk(form.phone)) {
      setPhoneError(ar ? "رقم الهاتف غير صحيح لهذه الدولة" : "Invalid phone number for the selected country");
      return;
    }
    setPhoneError("");
    try {
      await api.post("/employees", { ...form, base_salary: parseFloat(form.base_salary), allowance: parseFloat(form.allowance || "0"), job_title: form.job_title || null });
      setCreatedEmpId(form.employee_id);
      setAddStep(2);
      setError("");
    } catch (err: any) {
      if (err.message?.startsWith("QUOTA_EXCEEDED")) {
        setShowAdd(false);
        setQuotaError(err.message.replace("QUOTA_EXCEEDED: ", ""));
      } else {
        setError(err.message);
      }
    }
  };

  // Step 2: upload documents
  const handleUploadDocs = async () => {
    setDocUploading(true);
    const progress: Record<string, boolean> = {};
    for (const dt of DOC_TYPES) {
      const file = docFiles[dt.key];
      if (!file) continue;
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("documentType", dt.key);
        await apiPostForm(`/employees/${createdEmpId}/documents`, fd);
        progress[dt.key] = true;
      } catch { progress[dt.key] = false; }
    }
    setDocProgress(progress);
    setDocUploading(false);
    setSuccess(ar ? "تمت إضافة الموظف بنجاح" : "Employee added successfully");
    setShowAdd(false);
    setAddStep(1);
    setForm({ ...emptyForm });
    setDocFiles({});
    setDocProgress({});
    await loadEmployees();
    setSelectedId(form.employee_id || createdEmpId);
  };

  const openEdit = () => {
    if (!selectedEmployee) return;
    setEditForm({
      employee_id: selectedEmployee.employee_id || "",
      name: selectedEmployee.name || "",
      email: selectedEmployee.email || "",
      phone: selectedEmployee.phone || "",
      base_salary: selectedEmployee.base_salary || "",
      allowance: selectedEmployee.allowance || "",
      job_title: selectedEmployee.job_title || "",
      social_security: !!selectedEmployee.social_security,
      religion: selectedEmployee.religion || "",
      nationality: selectedEmployee.nationality || "",
      gender: selectedEmployee.gender || "",
      national_id: selectedEmployee.national_id || "",
      birth_date: selectedEmployee.birth_date ? String(selectedEmployee.birth_date).substring(0, 10) : "",
      photo_url: selectedEmployee.photo_url || "",
      work_type: selectedEmployee.work_type || "standard",
      workdays: selectedEmployee.workdays || "",
      req_hours: selectedEmployee.req_hours != null ? String(selectedEmployee.req_hours) : "",
    });
    setPhoneError(""); setEmailError("");
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!editForm.employee_id || !editForm.name || !editForm.email || !editForm.base_salary) { setError(t("fillRequired")); return; }
    if (!EMAIL_RE.test(editForm.email)) {
      setEmailError(ar ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format");
      return;
    }
    setEmailError("");
    if (!phoneOk(editForm.phone)) {
      setPhoneError(ar ? "رقم الهاتف غير صحيح لهذه الدولة" : "Invalid phone number for the selected country");
      return;
    }
    setPhoneError("");
    setSavingEdit(true);
    try {
      const res = await api.put(`/employees/${selectedEmployee.employee_id}`, { ...editForm, base_salary: parseFloat(editForm.base_salary), allowance: parseFloat(editForm.allowance || "0"), job_title: editForm.job_title || null });
      setEmployees((p) => p.map((emp) => emp.employee_id === selectedEmployee.employee_id ? res.data : emp));
      setSelectedId(res.data.employee_id);
      setSuccess(ar ? "تم تعديل بيانات الموظف" : "Employee updated successfully");
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
      setSuccess(ar ? "تم حذف الموظف" : "Employee deleted successfully");
    } catch (err: any) { setError(err.message); }
    finally { setDeleting(false); }
  };

  // ── Official letters ──────────────────────────────────────────────
  const printLetter = (kind: "salary" | "experience" | "noobjection") => {
    const e = selectedEmployee;
    if (!e) return;
    const u = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
    const company = u.company_name || "PayNest";
    const today = new Date().toLocaleDateString(ar ? "ar-EG" : "en-GB");
    const salary = (parseFloat(e.base_salary) || 0).toFixed(2);
    const job = e.job_title || (ar ? "موظف" : "Employee");
    const idNo = e.national_id || e.employee_id;

    const titles: Record<string, string> = {
      salary: ar ? "شهادة راتب" : "Salary Certificate",
      experience: ar ? "شهادة خبرة" : "Experience Certificate",
      noobjection: ar ? "كتاب عدم ممانعة" : "No-Objection Letter",
    };
    let body = "";
    if (kind === "salary") {
      body = ar
        ? `تشهد شركة <b>${company}</b> بأن السيد/ة <b>${e.name}</b> (الرقم: ${idNo}) يعمل/تعمل لدينا بوظيفة <b>${job}</b> براتب أساسي شهري قدره <b>${salary}</b> دينار أردني.<br/><br/>وقد مُنحت هذه الشهادة بناءً على طلبه/طلبها لتقديمها إلى الجهة المعنية (البنك) دون أدنى مسؤولية على الشركة.`
        : `This is to certify that <b>${e.name}</b> (ID: ${idNo}) is employed at <b>${company}</b> as <b>${job}</b> with a monthly basic salary of <b>${salary} JOD</b>.<br/><br/>This certificate is issued upon their request to be submitted to the concerned party (bank), without any liability on the company.`;
    } else if (kind === "experience") {
      body = ar
        ? `تشهد شركة <b>${company}</b> بأن السيد/ة <b>${e.name}</b> (الرقم: ${idNo}) قد عمل/عملت لدينا بوظيفة <b>${job}</b>، وقد أبدى/أبدت خلال فترة عمله/عملها كفاءةً عالية وحُسن سيرة وسلوك.<br/><br/>وقد مُنحت هذه الشهادة بناءً على طلبه/طلبها دون أدنى مسؤولية على الشركة.`
        : `This is to certify that <b>${e.name}</b> (ID: ${idNo}) has worked at <b>${company}</b> as <b>${job}</b>, demonstrating high competence and good conduct throughout the period of employment.<br/><br/>This certificate is issued upon their request without any liability on the company.`;
    } else {
      body = ar
        ? `لا تمانع شركة <b>${company}</b> قيام موظفها السيد/ة <b>${e.name}</b> (الرقم: ${idNo})، بوظيفة <b>${job}</b>، بإنهاء معاملاته/معاملاتها لدى الجهة المعنية.<br/><br/>وقد مُنح هذا الكتاب بناءً على طلبه/طلبها دون أدنى مسؤولية على الشركة.`
        : `<b>${company}</b> has no objection to its employee <b>${e.name}</b> (ID: ${idNo}), working as <b>${job}</b>, completing their procedures with the concerned party.<br/><br/>This letter is issued upon their request without any liability on the company.`;
    }

    const html = `<!doctype html><html dir="${ar ? "rtl" : "ltr"}" lang="${ar ? "ar" : "en"}"><head><meta charset="utf-8"><title>${titles[kind]} - ${e.name}</title>
      <style>
        @page { margin: 2.5cm; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color:#0f172a; line-height:2; }
        .head { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #0c8ce8; padding-bottom:14px; margin-bottom:30px; }
        .logo { width:46px;height:46px;border-radius:10px;background:linear-gradient(135deg,#1aa0f2,#075a9e); }
        .cname { font-size:22px; font-weight:800; }
        .date { color:#64748b; font-size:13px; }
        h1 { text-align:center; font-size:24px; margin:10px 0 28px; text-decoration:underline; }
        .body { font-size:16px; }
        .sign { margin-top:70px; }
        .sign .line { width:200px; border-top:1px solid #0f172a; padding-top:6px; font-size:13px; }
        .footer { margin-top:50px; border-top:1px solid #e2e8f0; padding-top:10px; color:#94a3b8; font-size:11px; text-align:center; }
      </style></head><body>
      <div class="head"><div><div class="cname">${company}</div><div class="date">${ar ? "التاريخ" : "Date"}: ${today}</div></div><div class="logo"></div></div>
      <h1>${titles[kind]}</h1>
      <div class="body">${body}</div>
      <div class="sign"><div class="line">${ar ? "التوقيع والختم — إدارة الموارد البشرية" : "Signature & Stamp — HR Department"}</div></div>
      <div class="footer">${company} • ${ar ? "صدر هذا المستند إلكترونياً عبر PayNest" : "Generated electronically via PayNest"}</div>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { setError(ar ? "فضلاً اسمح بالنوافذ المنبثقة" : "Please allow pop-ups"); return; }
    w.document.write(html);
    w.document.close();
    setShowLetterModal(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-slate-500"><span className="spinner spinner-dark w-5 h-5" />{t("loadingData")}</div>;

  const emailTitle = ar ? "البريد الإلكتروني" : "Email";
  const phoneTitle = ar ? "رقم الهاتف" : "Phone";
  const religionTitle = ar ? "الديانة" : "Religion";

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h2 className="page-title">{t("employees")}</h2><p className="page-subtitle">{t("employeeManagement")}</p></div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setAddStep(1); setForm({ ...emptyForm }); setDocFiles({}); setAddPhoto(""); setError(""); setPhoneError(""); setEmailError(""); }}>
          <Plus size={15} /> {t("addEmployee")}
        </button>
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
                <thead><tr><th /><th>{t("employeeId")}</th><th>{t("name")}</th><th>{emailTitle}</th><th className="text-right">{t("baseSalary")}</th><th className="text-right">{t("socialSecurity")}</th></tr></thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employee_id} className={clsx("group cursor-pointer", emp.employee_id === selectedId && "bg-brand-50")} onClick={() => setSelectedId(emp.employee_id)}>
                      <td className="pl-3" />
                      <td className="font-mono text-xs text-slate-500">{emp.employee_id}</td>
                      <td className="font-medium">
                        <div className="flex items-center gap-2">
                          {emp.photo_url ? (
                            <img src={emp.photo_url} alt={emp.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-bold flex-shrink-0">{emp.name?.[0]?.toUpperCase() || "?"}</div>
                          )}
                          <span className="truncate">{emp.name}</span>
                        </div>
                      </td>
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
                <button className="btn btn-sm btn-secondary" onClick={() => setShowLetterModal(true)}><FileText size={13} />{ar ? "خطاب" : "Letter"}</button>
                <button className="btn btn-sm btn-secondary" onClick={openEdit}><Edit2 size={13} />{ar ? "تعديل" : "Edit"}</button>
                <button className="btn btn-sm btn-danger" onClick={() => setShowDeleteConfirm(true)}><Trash2 size={13} />{ar ? "حذف" : "Delete"}</button>
              </div>
            )}
          </div>
          {!selectedEmployee ? <div className="text-sm text-slate-400">{t("selectEmployee")}</div> : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                {selectedEmployee.photo_url ? (
                  <img
                    src={selectedEmployee.photo_url}
                    alt={selectedEmployee.name}
                    onClick={() => setLightbox(selectedEmployee.photo_url)}
                    className="w-12 h-12 rounded-full object-cover cursor-pointer ring-2 ring-brand-100 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {selectedEmployee.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-base font-bold text-slate-900 truncate">{selectedEmployee.name}</div>
                  <div className="text-xs font-mono text-slate-400">{selectedEmployee.employee_id}</div>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {selectedEmployee.national_id && (
                  <div className="flex items-start gap-3 py-3">
                    <Hash size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{idFieldLabel()}</div>
                      <div className="text-sm font-medium text-slate-800">{selectedEmployee.national_id}</div>
                    </div>
                  </div>
                )}
                {selectedEmployee.birth_date && (
                  <div className="flex items-start gap-3 py-3">
                    <Calendar size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{ar ? "تاريخ الميلاد" : "Date of Birth"}</div>
                      <div className="text-sm font-medium text-slate-800">{new Date(selectedEmployee.birth_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
                {selectedEmployee.job_title && (
                  <div className="flex items-start gap-3 py-3">
                    <FileText size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{ar ? "المسمى الوظيفي" : "Job Title"}</div>
                      <div className="text-sm font-medium text-slate-800">{selectedEmployee.job_title}</div>
                    </div>
                  </div>
                )}
                {selectedEmployee.nationality && (
                  <div className="flex items-start gap-3 py-3">
                    <Shield size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{ar ? "الجنسية" : "Nationality"}</div>
                      <div className="text-sm font-medium text-slate-800">{nationalityLabel(selectedEmployee.nationality)}</div>
                    </div>
                  </div>
                )}
                {selectedEmployee.gender && (
                  <div className="flex items-start gap-3 py-3">
                    <Users size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{ar ? "الجنس" : "Gender"}</div>
                      <div className="text-sm font-medium text-slate-800">{selectedEmployee.gender === "male" ? (ar ? "ذكر" : "Male") : selectedEmployee.gender === "female" ? (ar ? "أنثى" : "Female") : selectedEmployee.gender}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 py-3">
                  <Mail size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{emailTitle}</div>
                    <div className="text-sm text-slate-800 break-all leading-snug">{selectedEmployee.email || "-"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-3">
                  <Phone size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{phoneTitle}</div>
                    <div className="text-sm text-slate-800">{selectedEmployee.phone || "-"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-3">
                  <Hash size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{t("baseSalary")}</div>
                    <div className="text-sm font-mono font-semibold text-slate-900">{formatCurrency(selectedEmployee.base_salary)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 py-3 border-t border-slate-50">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "القسم" : "Department"}</div>
                    <div className="text-sm font-medium text-slate-800">{selectedEmployee.department || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "تاريخ الانضمام" : "Join Date"}</div>
                    <div className="text-sm font-medium text-slate-800">{selectedEmployee.join_date ? String(selectedEmployee.join_date).substring(0, 10) : "-"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "تاريخ انتهاء العقد" : "Contract End"}</div>
                    <div className="text-sm font-medium text-slate-800">{selectedEmployee.contract_end_date ? String(selectedEmployee.contract_end_date).substring(0, 10) : "-"}</div>
                  </div>
                </div>
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
                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "الإجازات السنوية المتبقية" : "Annual Leave Remaining"}</div>
                    <span className={clsx("badge", Number(selectedBalance?.annual_remaining ?? 14) > 5 ? "badge-green" : Number(selectedBalance?.annual_remaining ?? 14) > 0 ? "badge-yellow" : "badge-red")}>
                      <Calendar size={11} />{selectedBalance?.annual_remaining ?? 14} {ar ? "يوم" : "days"}
                    </span>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "الإجازات المرضية المتبقية" : "Sick Leave Remaining"}</div>
                    <span className={clsx("badge", Number(selectedBalance?.sick_remaining ?? 14) > 5 ? "badge-green" : Number(selectedBalance?.sick_remaining ?? 14) > 0 ? "badge-yellow" : "badge-red")}>
                      <Calendar size={11} />{selectedBalance?.sick_remaining ?? 14} {ar ? "يوم" : "days"}
                    </span>
                  </div>
                </div>
                {/* Documents — view / replace / delete each one */}
                <div className="py-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{ar ? "الوثائق المرفوعة" : "Uploaded Documents"}</div>
                  <div className="space-y-2">
                    {/* Profile photo row */}
                    <div className="flex items-center gap-2 py-1.5 border-b border-slate-50">
                      {selectedEmployee.photo_url
                        ? <img src={selectedEmployee.photo_url} alt="" onClick={() => setLightbox(selectedEmployee.photo_url)} className="w-5 h-5 rounded-full object-cover cursor-pointer flex-shrink-0" />
                        : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 flex-shrink-0" />}
                      <span className={clsx("text-xs flex-1 min-w-0 truncate", selectedEmployee.photo_url ? "text-slate-700 font-medium" : "text-slate-400")}>
                        {ar ? "الصورة الشخصية" : "Profile Photo"}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {selectedEmployee.photo_url && (
                          <button onClick={() => setLightbox(selectedEmployee.photo_url)} title={ar ? "عرض" : "View"} className="p-1 rounded hover:bg-brand-50 text-brand-600"><Eye size={13} /></button>
                        )}
                        <label title={ar ? "رفع/تغيير" : "Upload"} className="p-1 rounded hover:bg-brand-50 text-brand-600 cursor-pointer">
                          <Upload size={13} />
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            if (f.size > 5 * 1024 * 1024) { setError(ar ? "الصورة أكبر من 5MB" : "Image exceeds 5MB"); return; }
                            const b64 = await toBase64(f);
                            try {
                              const res = await api.put(`/employees/${selectedEmployee.employee_id}`, { photo_url: b64 });
                              setEmployees((p) => p.map((emp) => emp.employee_id === selectedEmployee.employee_id ? res.data : emp));
                              setSuccess(ar ? "تم تحديث الصورة" : "Photo updated");
                            } catch (er: any) { setError(er.message); }
                          }} />
                        </label>
                        {selectedEmployee.photo_url && (
                          <button title={ar ? "حذف" : "Delete"} className="p-1 rounded hover:bg-rose-50 text-rose-500" onClick={async () => {
                            if (!window.confirm(ar ? "حذف الصورة؟" : "Delete photo?")) return;
                            try {
                              const res = await api.put(`/employees/${selectedEmployee.employee_id}`, { photo_url: "" });
                              setEmployees((p) => p.map((emp) => emp.employee_id === selectedEmployee.employee_id ? res.data : emp));
                              setSuccess(ar ? "تم الحذف" : "Deleted");
                            } catch (er: any) { setError(er.message); }
                          }}><Trash2 size={13} /></button>
                        )}
                      </div>
                    </div>
                    {DOC_TYPES.map((dt) => {
                      const uploaded = empDocs.find((d) => d.documentType === dt.key);
                      const empIdParam = selectedEmployee.employee_id;
                      const inputId = `replace-${dt.key}`;
                      const downloadUrl = `/api/employees/${empIdParam}/documents/${dt.key}`;
                      const openDoc = async () => {
                        try {
                          const token = localStorage.getItem("token");
                          const res = await fetch(downloadUrl, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
                          if (!res.ok) throw new Error("Failed to load");
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          window.open(url, "_blank");
                          setTimeout(() => URL.revokeObjectURL(url), 60_000);
                        } catch (e: any) { setError(e.message); }
                      };
                      const replaceDoc = async (file: File) => {
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          fd.append("documentType", dt.key);
                          await apiPostForm(`/employees/${empIdParam}/documents`, fd);
                          await loadDocs(empIdParam);
                          setSuccess(ar ? "تم التحديث" : "Updated");
                        } catch (e: any) { setError(e.message); }
                      };
                      const deleteDoc = async () => {
                        if (!window.confirm(ar ? "تأكيد حذف هذه الوثيقة؟" : "Delete this document?")) return;
                        try {
                          const token = localStorage.getItem("token");
                          const res = await fetch(downloadUrl, { method: "DELETE", credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
                          if (!res.ok) throw new Error("Delete failed");
                          await loadDocs(empIdParam);
                          setSuccess(ar ? "تم الحذف" : "Deleted");
                        } catch (e: any) { setError(e.message); }
                      };
                      return (
                        <div key={dt.key} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                          {uploaded
                            ? <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                            : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 flex-shrink-0" />}
                          <span className={clsx("text-xs flex-1 min-w-0 truncate", uploaded ? "text-slate-700 font-medium" : "text-slate-400")}>
                            {ar ? dt.ar : dt.en}
                            {uploaded?.fileName && <span className="text-slate-400 ms-1">— {uploaded.fileName}</span>}
                          </span>
                          {uploaded ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={openDoc} title={ar ? "عرض" : "View"} className="p-1 rounded hover:bg-brand-50 text-brand-600">
                                <Eye size={13} />
                              </button>
                              <label htmlFor={inputId} title={ar ? "استبدال" : "Replace"} className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer">
                                <Upload size={13} />
                                <input id={inputId} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden"
                                  onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceDoc(f); e.target.value = ""; }} />
                              </label>
                              <button onClick={deleteDoc} title={ar ? "حذف" : "Delete"} className="p-1 rounded hover:bg-rose-50 text-rose-500">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <label htmlFor={inputId} title={ar ? "رفع" : "Upload"} className="p-1 rounded hover:bg-brand-50 text-brand-600 cursor-pointer shrink-0">
                              <Upload size={13} />
                              <input id={inputId} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceDoc(f); e.target.value = ""; }} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Employee Modal (2 steps) ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setAddStep(1); } }}>
          <div className="modal">
            {/* Step indicator */}
            <div className="modal-header">
              <h3 className="modal-title">{t("newEmployee")}</h3>
              <button className="modal-close" onClick={() => { setShowAdd(false); setAddStep(1); }}><X size={18} /></button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3 px-1 pb-4">
              <div className={clsx("flex items-center gap-1.5 text-sm font-semibold", addStep === 1 ? "text-brand-600" : "text-emerald-600")}>
                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", addStep === 1 ? "bg-brand-600 text-white" : "bg-emerald-100 text-emerald-600")}>
                  {addStep > 1 ? <CheckCircle size={14} /> : "1"}
                </div>
                {ar ? "معلومات الموظف" : "Employee Info"}
              </div>
              <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
              <div className={clsx("flex items-center gap-1.5 text-sm font-semibold", addStep === 2 ? "text-brand-600" : "text-slate-400")}>
                <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", addStep === 2 ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400")}>
                  2
                </div>
                {ar ? "رفع الوثائق" : "Upload Documents"}
              </div>
            </div>

            {/* Step 1 */}
            {addStep === 1 && (
              <form onSubmit={handleAddStep1} className="space-y-4">
                <div><label className="form-label">{t("employeeId")} *</label><input className="form-input" value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} placeholder="EMP-001" /></div>
                <div><label className="form-label">{t("name")} *</label><input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="form-label">{idFieldLabel()}</label><input className="form-input" value={form.national_id} onChange={(e) => setForm((f) => ({ ...f, national_id: e.target.value }))} placeholder={ar ? "الرقم الوطني أو رقم الوثيقة/الجواز" : "National ID or Document/Passport No."} /></div>
                <div><label className="form-label">{ar ? "تاريخ الميلاد" : "Date of Birth"}</label><input type="date" className="form-input" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} /></div>
                <div><label className="form-label">{ar ? "الجنسية" : "Nationality"}</label><input className="form-input" value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} placeholder={ar ? "مثال: أردني" : "e.g. Jordanian"} /></div>
                <div>
                  <label className="form-label">{emailTitle} *</label>
                  <input type="email" className={clsx("form-input", emailError && "border-rose-500 ring-1 ring-rose-500 focus:border-rose-500")} value={form.email} onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); if (emailError) setEmailError(""); }} placeholder="employee@company.com" />
                  {emailError && <p className="text-xs text-rose-600 mt-1">{emailError}</p>}
                </div>
                <div>
                  <label className="form-label">{phoneTitle}</label>
                  <PhoneInput value={form.phone} error={!!phoneError} onChange={(v) => { setForm((f) => ({ ...f, phone: v })); if (phoneError) setPhoneError(""); }} />
                  {phoneError && <p className="text-xs text-rose-600 mt-1">{phoneError}</p>}
                </div>
                <div><label className="form-label">{t("baseSalary")} *</label><input type="number" className="form-input" value={form.base_salary} onChange={(e) => setForm((f) => ({ ...f, base_salary: e.target.value }))} placeholder="0.00" /></div>
                <div><label className="form-label">{ar ? "العلاوة (Allowance)" : "Allowance"}</label><input type="number" className="form-input" value={form.allowance} onChange={(e) => setForm((f) => ({ ...f, allowance: e.target.value }))} placeholder="0.00" /></div>
                <div><label className="form-label">{ar ? "المسمى الوظيفي" : "Job Title"}</label><input className="form-input" value={form.job_title} onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} placeholder={ar ? "مثال: مطور برمجيات" : "e.g. Software Engineer"} /></div>
                <div><label className="form-label">{ar ? "الجنس" : "Gender"}</label><select className="form-input" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}><option value="">{ar ? "اختر الجنس" : "Select gender"}</option><option value="male">{ar ? "ذكر" : "Male"}</option><option value="female">{ar ? "أنثى" : "Female"}</option></select></div>
                <div><label className="form-label">{religionTitle}</label><input className="form-input" value={form.religion} onChange={(e) => setForm((f) => ({ ...f, religion: e.target.value }))} placeholder={ar ? "مثال: مسلم" : "e.g. Muslim"} /></div>
                <div className="flex items-center justify-between"><div className="text-sm font-medium text-slate-700">{t("socialSecurity")}</div><label className="toggle"><input type="checkbox" checked={form.social_security} onChange={(e) => setForm((f) => ({ ...f, social_security: e.target.checked }))} /><span className="toggle-slider" /></label></div>
                <ScheduleFields f={form} set={(u) => setForm((prev) => ({ ...prev, ...u }))} ar={ar} />
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t("cancel")}</button>
                  <button type="submit" className="btn btn-primary">{ar ? "التالي" : "Next"} <ChevronRight size={15} /></button>
                </div>
              </form>
            )}

            {/* Step 2 */}
            {addStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">{ar ? "يرجى رفع الوثائق المطلوبة لكل موظف (PDF أو Word). يمكنك تخطي هذه الخطوة." : "Upload the required documents for this employee (PDF or Word). You may skip this step."}</p>
                {/* Profile photo */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  {addPhoto ? (
                    <img src={addPhoto} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center"><Eye size={18} /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700">{ar ? "الصورة الشخصية" : "Profile Photo"}</div>
                    <div className="text-xs text-slate-400">{ar ? "تظهر جنب اسم الموظف" : "Shown next to the employee's name"}</div>
                  </div>
                  <label className="btn btn-sm btn-secondary cursor-pointer flex-shrink-0">
                    <Upload size={13} />{addPhoto ? (ar ? "تغيير" : "Change") : (ar ? "رفع" : "Upload")}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      if (f.size > 5 * 1024 * 1024) { setError(ar ? "الصورة أكبر من 5MB" : "Image exceeds 5MB"); return; }
                      const b64 = await toBase64(f); setAddPhoto(b64);
                      try { await api.put(`/employees/${createdEmpId}`, { photo_url: b64 }); } catch { /* saved on finish */ }
                    }} />
                  </label>
                </div>
                <div className="space-y-3">
                  {DOC_TYPES.map((dt) => {
                    const file = docFiles[dt.key];
                    return (
                      <div key={dt.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", file ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400")}>
                          {file ? <CheckCircle size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700">{ar ? dt.ar : dt.en}</div>
                          {file && <div className="text-xs text-slate-400 truncate">{file.name}</div>}
                        </div>
                        <label className="btn btn-sm btn-secondary cursor-pointer flex-shrink-0">
                          <Upload size={13} />
                          {ar ? "رفع" : "Upload"}
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setDocFiles((prev) => ({ ...prev, [dt.key]: f }));
                            }}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between gap-2 pt-2">
                  <button className="btn btn-secondary" onClick={() => setAddStep(1)} disabled={docUploading}>
                    {ar ? "رجوع" : "Back"}
                  </button>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={handleUploadDocs} disabled={docUploading}>
                      {ar ? "تخطي" : "Skip"}
                    </button>
                    <button className="btn btn-primary" onClick={handleUploadDocs} disabled={docUploading || Object.keys(docFiles).length === 0}>
                      {docUploading ? <span className="spinner" /> : <CheckCircle2 size={15} />}
                      {ar ? "حفظ" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false); }}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">{ar ? "تعديل الموظف" : "Edit Employee"}</h3><button className="modal-close" onClick={() => setShowEdit(false)}><X size={18} /></button></div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="flex items-center gap-3">
                {editForm.photo_url ? (
                  <img src={editForm.photo_url} alt="" onClick={() => setLightbox(editForm.photo_url)} className="w-14 h-14 rounded-full object-cover ring-2 ring-brand-100 cursor-pointer" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-lg font-bold">{editForm.name?.[0]?.toUpperCase() || "?"}</div>
                )}
                <div className="flex items-center gap-2">
                  <label className="btn btn-sm btn-secondary cursor-pointer">
                    <Upload size={13} />{ar ? "تغيير الصورة" : "Change Photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      if (f.size > 5 * 1024 * 1024) { setError(ar ? "الصورة أكبر من 5MB" : "Image exceeds 5MB"); return; }
                      const b64 = await toBase64(f); setEditForm((ff) => ({ ...ff, photo_url: b64 }));
                    }} />
                  </label>
                  {editForm.photo_url && (
                    <button type="button" className="text-xs text-rose-500 hover:underline" onClick={() => setEditForm((ff) => ({ ...ff, photo_url: "" }))}>{ar ? "إزالة" : "Remove"}</button>
                  )}
                </div>
              </div>
              <div><label className="form-label">{t("employeeId")} *</label><input className="form-input" value={editForm.employee_id} onChange={(e) => setEditForm((f) => ({ ...f, employee_id: e.target.value }))} /></div>
              <div><label className="form-label">{t("name")} *</label><input className="form-input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="form-label">{idFieldLabel()}</label><input className="form-input" value={editForm.national_id} onChange={(e) => setEditForm((f) => ({ ...f, national_id: e.target.value }))} placeholder={ar ? "الرقم الوطني أو رقم الوثيقة/الجواز" : "National ID or Document/Passport No."} /></div>
              <div><label className="form-label">{ar ? "تاريخ الميلاد" : "Date of Birth"}</label><input type="date" className="form-input" value={editForm.birth_date} onChange={(e) => setEditForm((f) => ({ ...f, birth_date: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "الجنسية" : "Nationality"}</label><input className="form-input" value={editForm.nationality} onChange={(e) => setEditForm((f) => ({ ...f, nationality: e.target.value }))} placeholder={ar ? "مثال: أردني" : "e.g. Jordanian"} /></div>
              <div>
                <label className="form-label">{emailTitle} *</label>
                <input type="email" className={clsx("form-input", emailError && "border-rose-500 ring-1 ring-rose-500 focus:border-rose-500")} value={editForm.email} onChange={(e) => { setEditForm((f) => ({ ...f, email: e.target.value })); if (emailError) setEmailError(""); }} />
                {emailError && <p className="text-xs text-rose-600 mt-1">{emailError}</p>}
              </div>
              <div>
                <label className="form-label">{phoneTitle}</label>
                <PhoneInput value={editForm.phone} error={!!phoneError} onChange={(v) => { setEditForm((f) => ({ ...f, phone: v })); if (phoneError) setPhoneError(""); }} />
                {phoneError && <p className="text-xs text-rose-600 mt-1">{phoneError}</p>}
              </div>
              <div><label className="form-label">{t("baseSalary")} *</label><input type="number" className="form-input" value={editForm.base_salary} onChange={(e) => setEditForm((f) => ({ ...f, base_salary: e.target.value }))} /></div>
              <div><label className="form-label">{ar ? "العلاوة (Allowance)" : "Allowance"}</label><input type="number" className="form-input" value={editForm.allowance} onChange={(e) => setEditForm((f) => ({ ...f, allowance: e.target.value }))} placeholder="0.00" /></div>
              <div><label className="form-label">{ar ? "المسمى الوظيفي" : "Job Title"}</label><input className="form-input" value={editForm.job_title} onChange={(e) => setEditForm((f) => ({ ...f, job_title: e.target.value }))} placeholder={ar ? "مثال: مطور برمجيات" : "e.g. Software Engineer"} /></div>
              <div><label className="form-label">{ar ? "الجنس" : "Gender"}</label><select className="form-input" value={editForm.gender} onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}><option value="">{ar ? "اختر الجنس" : "Select gender"}</option><option value="male">{ar ? "ذكر" : "Male"}</option><option value="female">{ar ? "أنثى" : "Female"}</option></select></div>
              <div><label className="form-label">{religionTitle}</label><input className="form-input" value={editForm.religion} onChange={(e) => setEditForm((f) => ({ ...f, religion: e.target.value }))} placeholder={ar ? "مثال: مسلم" : "e.g. Muslim"} /></div>
              <div className="flex items-center justify-between"><div className="text-sm font-medium text-slate-700">{t("socialSecurity")}</div><label className="toggle"><input type="checkbox" checked={editForm.social_security} onChange={(e) => setEditForm((f) => ({ ...f, social_security: e.target.checked }))} /><span className="toggle-slider" /></label></div>
              <ScheduleFields f={editForm} set={(u) => setEditForm((prev) => ({ ...prev, ...u }))} ar={ar} />
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
                <h3 className="text-lg font-bold text-slate-900">{ar ? "تأكيد الحذف" : "Delete Employee"}</h3>
                <p className="text-sm text-slate-500 mt-2">{ar ? "هل أنت متأكد من حذف هذا الموظف؟" : "Are you sure you want to delete this employee?"}</p>
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                  <div className="font-semibold text-slate-900">{selectedEmployee.name}</div>
                  <div className="text-slate-500 font-mono text-xs mt-1">{selectedEmployee.employee_id}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>{ar ? "لا" : "Cancel"}</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? <span className="spinner" /> : <Trash2 size={15} />}{ar ? "نعم، حذف" : "Yes, Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quota Exceeded Modal (Upgrade Plan) ──────────────────────── */}
      {quotaError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" dir={ar ? "rtl" : "ltr"}>
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 px-6 py-8 text-white text-center">
              <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                <Crown size={32} />
              </div>
              <h2 className="text-xl font-bold mb-1">
                {ar ? "تم الوصول إلى الحد الأقصى" : "Employee Limit Reached"}
              </h2>
              <p className="text-amber-50 text-sm">
                {ar ? "اشترك في باقة أكبر للمتابعة" : "Subscribe to a larger plan to continue"}
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                {quotaError}
              </div>
              <p className="text-sm text-slate-500">
                {ar
                  ? "للترقية، تواصل مع مسؤول النظام (Super Admin) لرفع حدود الموظفين لشركتك."
                  : "To upgrade, contact the system administrator (Super Admin) to raise your company's employee cap."}
              </p>
              <div className="flex justify-end gap-2">
                <button className="btn btn-secondary" onClick={() => setQuotaError("")}>
                  {ar ? "حسناً" : "OK"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official letter chooser */}
      {showLetterModal && selectedEmployee && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLetterModal(false); }}>
          <div className="modal max-w-md">
            <div className="modal-header">
              <h3 className="modal-title">{ar ? "إصدار خطاب رسمي" : "Issue Official Letter"}</h3>
              <button className="modal-close" onClick={() => setShowLetterModal(false)}><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-3">{ar ? `للموظف: ${selectedEmployee.name}` : `For: ${selectedEmployee.name}`}</p>
            <div className="space-y-2">
              {[
                { k: "salary", icon: "🏦", ar: "شهادة راتب (للبنك)", en: "Salary Certificate (for bank)" },
                { k: "experience", icon: "💼", ar: "شهادة خبرة", en: "Experience Certificate" },
                { k: "noobjection", icon: "✅", ar: "كتاب عدم ممانعة", en: "No-Objection Letter" },
              ].map((o) => (
                <button key={o.k} onClick={() => printLetter(o.k as any)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50/40 text-start transition-all">
                  <span className="text-xl">{o.icon}</span>
                  <span className="font-medium text-slate-800">{ar ? o.ar : o.en}</span>
                  <ChevronRight size={16} className={clsx("ms-auto text-slate-400", ar && "rotate-180")} />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">{ar ? "ستفتح نافذة الطباعة — اختر «حفظ كـ PDF»." : "A print dialog opens — choose “Save as PDF”."}</p>
          </div>
        </div>
      )}

      {/* Photo lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6" onClick={() => setLightbox("")}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-5 right-5 text-white/90 hover:text-white" onClick={() => setLightbox("")}><X size={28} /></button>
        </div>
      )}
    </div>
  );
}
