"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

function LangToggle() {
  const { lang, toggleLanguage } = useLanguage();
  return (
    <button onClick={() => toggleLanguage()} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
      <Globe size={15} />
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [form, setForm] = useState({ companyName: "", slug: "", ownerName: "", email: "", password: "", confirmPassword: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === "companyName" && !slugTouched) {
        next.slug = val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      }
      if (field === "slug") setSlugTouched(true);
      return next;
    });
  };

  const slugValid = /^[a-z0-9][a-z0-9-]*$/.test(form.slug);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!slugValid) { setError(ar ? "المعرّف يجب أن يحتوي على أحرف إنجليزية وأرقام فقط" : "Slug must contain only English letters and numbers"); return; }
    if (form.password !== form.confirmPassword) { setError(ar ? "كلمتا السر غير متطابقتين" : "Passwords do not match"); return; }
    if (form.password.length < 6) { setError(ar ? "كلمة السر يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters"); return; }

    try {
      setLoading(true);
      const res = await api.post("/auth/register-company", { companyName: form.companyName, slug: form.slug, ownerName: form.ownerName, email: form.email, password: form.password });
      if (res.data.pending) { setPending(true); return; }
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("paynest_logged_in", "true");
      localStorage.setItem("role", user.role);
      localStorage.setItem("user", JSON.stringify(user));
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="absolute top-4 right-4"><LangToggle /></div>
      <div className="w-full max-w-md">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowRight size={16} className={ar ? "" : "rotate-180"} />
          {ar ? "العودة" : "Back"}
        </button>

        <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-center text-slate-900 mb-1">{ar ? "تسجيل شركة جديدة" : "Register Your Company"}</h1>
          <p className="text-center text-slate-500 text-sm mb-6">Pay<span className="text-blue-600">Nest</span></p>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1">{ar ? "اسم الشركة" : "Company Name"}</label>
            <input type="text" value={form.companyName} onChange={set("companyName")} placeholder={ar ? "مثال: شركة النجوم" : "e.g. Stars Corp"} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1">{ar ? "المعرّف (Slug)" : "Slug (unique ID)"}</label>
            <input type="text" value={form.slug} onChange={set("slug")} onBlur={() => setSlugTouched(true)} placeholder="my-company" required dir="ltr"
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.slug && !slugValid ? "border-red-400" : "border-slate-200"}`} />
            <p className="text-xs text-slate-400 mt-1">{ar ? "أحرف إنجليزية وأرقام وشرطة فقط — مثال: my-company" : "English letters, numbers, and hyphens only — e.g. my-company"}</p>
          </div>

          {[
            { key: "ownerName", label: "Owner Name", arLabel: "اسم المالك", ph: ar ? "الاسم الكامل" : "Full name" },
            { key: "email", label: "Email", arLabel: "البريد الإلكتروني", ph: "email@company.com", type: "email", dir: "ltr" },
            { key: "password", label: "Password", arLabel: "كلمة السر", ph: ar ? "6 أحرف على الأقل" : "At least 6 characters", type: "password" },
            { key: "confirmPassword", label: "Confirm Password", arLabel: "تأكيد كلمة السر", ph: ar ? "أعد كتابة كلمة السر" : "Repeat password", type: "password" },
          ].map(({ key, label, arLabel, ph, type = "text", dir: fDir }) => (
            <div key={key} className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1">{ar ? arLabel : label}</label>
              <input type={type} value={(form as any)[key]} onChange={set(key)} placeholder={ph} required dir={fDir as any}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}

          {error && <div className="text-red-600 text-sm mb-4 text-center">{error}</div>}

          {pending && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm text-center mb-4">
              {ar ? "تم التسجيل بنجاح. سيتم مراجعة طلبك من قِبل الإدارة قريباً." : "Registration submitted! Awaiting admin approval before you can log in."}
            </div>
          )}

          <button disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-60 transition-colors">
            {loading ? (ar ? "جاري التسجيل..." : "Creating account...") : (ar ? "إنشاء الحساب" : "Create Account")}
          </button>

          <p className="text-center text-slate-500 text-sm mt-4">
            {ar ? "لديك حساب؟ " : "Already have an account? "}
            <button type="button" onClick={() => router.push("/hr-login")} className="text-blue-600 hover:underline font-medium">
              {ar ? "سجّل دخولك" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
