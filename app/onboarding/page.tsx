"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, Calculator, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const STEPS = [
  { id: 1, icon: Building2,    title: "Company Profile",  titleAr: "ملف الشركة" },
  { id: 2, icon: Users,        title: "First Employees",  titleAr: "الموظفون الأوائل" },
  { id: 3, icon: Calculator,   title: "Payroll Settings", titleAr: "إعدادات الرواتب" },
  { id: 4, icon: CheckCircle2, title: "You're All Set!",  titleAr: "انتهيت!" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [companyName, setCompanyName] = useState(
    typeof window !== "undefined" ? localStorage.getItem("companyName") || "" : ""
  );
  const [currency, setCurrency] = useState("JOD");
  const [employees, setEmployees] = useState([{ name: "", email: "" }]);
  const [reqHours, setReqHours] = useState("8");
  const [monthDays, setMonthDays] = useState("26");
  const [workdays, setWorkdays] = useState("Sun,Mon,Tue,Wed,Thu");

  const addEmployee = () => { if (employees.length < 5) setEmployees([...employees, { name: "", email: "" }]); };
  const updateEmployee = (i: number, field: "name" | "email", val: string) =>
    setEmployees(employees.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  const saveStep1 = async () => {
    setSaving(true); setError("");
    try {
      await api.patch("/settings", { companyName });
      if (typeof window !== "undefined") localStorage.setItem("companyName", companyName);
      setStep(2);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const saveStep2 = async () => {
    setSaving(true); setError("");
    try {
      const filled = employees.filter((e) => e.name.trim());
      for (const emp of filled) {
        await api.post("/employees", { name: emp.name, email: emp.email || undefined }).catch(() => {});
      }
      setStep(3);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const saveStep3 = async () => {
    setSaving(true); setError("");
    try {
      await api.patch("/settings", { reqHours: parseFloat(reqHours), monthDays: parseInt(monthDays), workdays });
      setStep(4);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const finish = async () => {
    setSaving(true);
    try { await api.patch("/companies/onboarding-complete", {}); } catch {}
    router.push("/dashboard");
  };

  const skip = async () => {
    try { await api.patch("/companies/onboarding-complete", {}); } catch {}
    router.push("/dashboard");
  };

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between">
        <span className="font-black text-[15px] text-slate-900">Pay<span className="text-brand-600">Nest</span></span>
        <button onClick={skip} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          {ar ? "تخطي الإعداد" : "Skip setup"}
        </button>
      </header>

      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.id ? "bg-brand-600 text-white" :
                step === s.id ? "bg-brand-600 text-white ring-4 ring-brand-100" :
                "bg-slate-100 text-slate-400"
              }`}>
                {step > s.id ? <CheckCircle2 size={14} /> : s.id}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step === s.id ? "text-brand-700" : "text-slate-400"}`}>
                {ar ? s.titleAr : s.title}
              </span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > s.id ? "bg-brand-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-elevated border border-slate-200/70 p-8 w-full max-w-xl">
          {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">{error}</div>}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">{ar ? "ملف الشركة" : "Company Profile"}</h2>
                <p className="text-sm text-slate-500 mt-1">{ar ? "تأكيد معلومات شركتك الأساسية." : "Confirm your company's basic information."}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "اسم الشركة" : "Company Name"}</label>
                  <input className="form-input w-full" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "العملة" : "Currency"}</label>
                  <select className="form-input w-full" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="JOD">JOD — Jordanian Dinar</option>
                    <option value="SAR">SAR — Saudi Riyal</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EGP">EGP — Egyptian Pound</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary w-full" onClick={saveStep1} disabled={saving || !companyName.trim()}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {ar ? "التالي" : "Next"} <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">{ar ? "إضافة موظفين" : "Add Employees"}</h2>
                <p className="text-sm text-slate-500 mt-1">{ar ? "أضف حتى 5 موظفين. يمكنك إضافة المزيد لاحقاً." : "Add up to 5 employees. You can add more later."}</p>
              </div>
              <div className="space-y-3">
                {employees.map((emp, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="form-input flex-1" placeholder={ar ? "الاسم" : "Name"} value={emp.name} onChange={(e) => updateEmployee(i, "name", e.target.value)} />
                    <input className="form-input flex-1" placeholder={ar ? "البريد (اختياري)" : "Email (optional)"} value={emp.email} onChange={(e) => updateEmployee(i, "email", e.target.value)} />
                  </div>
                ))}
                {employees.length < 5 && (
                  <button onClick={addEmployee} className="text-sm text-brand-600 hover:text-brand-800 font-medium">+ {ar ? "إضافة موظف" : "Add another"}</button>
                )}
              </div>
              <div className="flex gap-3">
                <button className="btn btn-secondary flex-1" onClick={() => setStep(1)}><ArrowLeft size={15} className={ar ? "rotate-180" : ""} /> {ar ? "السابق" : "Back"}</button>
                <button className="btn btn-primary flex-1" onClick={saveStep2} disabled={saving}>
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {ar ? "التالي" : "Next"} <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
                </button>
              </div>
              <button onClick={() => setStep(3)} className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors">
                {ar ? "تخطي هذه الخطوة" : "Skip this step"}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">{ar ? "إعدادات الرواتب" : "Payroll Settings"}</h2>
                <p className="text-sm text-slate-500 mt-1">{ar ? "اضبط دورة العمل وساعات العمل." : "Configure your work cycle and hours."}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "ساعات العمل اليومية" : "Required Hours / Day"}</label>
                  <input type="number" className="form-input w-full" value={reqHours} onChange={(e) => setReqHours(e.target.value)} min="1" max="24" step="0.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "أيام العمل في الشهر" : "Working Days / Month"}</label>
                  <input type="number" className="form-input w-full" value={monthDays} onChange={(e) => setMonthDays(e.target.value)} min="20" max="31" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "أيام العمل الأسبوعية" : "Workdays"}</label>
                  <select className="form-input w-full" value={workdays} onChange={(e) => setWorkdays(e.target.value)}>
                    <option value="Sun,Mon,Tue,Wed,Thu">Sun–Thu (Middle East standard)</option>
                    <option value="Mon,Tue,Wed,Thu,Fri">Mon–Fri (Western standard)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-secondary flex-1" onClick={() => setStep(2)}><ArrowLeft size={15} className={ar ? "rotate-180" : ""} /> {ar ? "السابق" : "Back"}</button>
                <button className="btn btn-primary flex-1" onClick={saveStep3} disabled={saving}>
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {ar ? "التالي" : "Next"} <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{ar ? "كل شيء جاهز!" : "You're all set!"}</h2>
                <p className="text-sm text-slate-500 mt-2">
                  {ar ? "تم إعداد شركتك. يمكنك الآن استخدام PayNest بالكامل." : "Your company is configured. You can now use PayNest to its full potential."}
                </p>
              </div>
              <button className="btn btn-primary w-full" onClick={finish} disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {ar ? "الانتقال إلى لوحة التحكم" : "Go to Dashboard"} <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
