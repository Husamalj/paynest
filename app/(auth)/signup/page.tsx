"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, ArrowLeft, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

function LangToggle() {
  const { lang, toggleLanguage } = useLanguage();
  return (
    <button
      onClick={() => toggleLanguage()}
      className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm transition-colors"
    >
      <Globe size={15} />
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  const [form, setForm] = useState({
    companyName: "",
    slug: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === "companyName" && !slugTouched) {
        next.slug = val
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      }
      if (field === "slug") setSlugTouched(true);
      return next;
    });
  };

  const slugValid = /^[a-z0-9][a-z0-9-]*$/.test(form.slug);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!slugValid) {
      setError(
        ar
          ? "المعرّف يجب أن يحتوي على أحرف إنجليزية وأرقام فقط"
          : "Slug must contain only English letters and numbers"
      );
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(ar ? "كلمتا السر غير متطابقتين" : "Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError(
        ar
          ? "كلمة السر يجب أن تكون 6 أحرف على الأقل"
          : "Password must be at least 6 characters"
      );
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/register-company", {
        companyName: form.companyName,
        slug: form.slug,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
      });
      if (res.data.pending) {
        setPending(true);
        return;
      }
      const { user } = res.data;
      // Credential (when issued) is set by the server as an httpOnly cookie.
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
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative min-h-screen flex flex-col bg-slate-50"
    >
      {/* Soft brand radial blob */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(12, 140, 232, 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Slim header */}
      <header className="relative bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <Back size={16} />
          {ar ? "العودة" : "Back"}
        </button>
        <button
          onClick={() => router.push("/")}
          className="font-bold text-slate-900 text-[15px] hover:opacity-70 transition-opacity"
        >
          Pay<span className="text-brand-600">Nest</span>
        </button>
        <LangToggle />
      </header>

      {/* Main */}
      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl shadow-elevated border border-slate-200/70 p-8"
          >
            {/* Icon + title */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Building2 size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-center text-slate-900 mb-1">
              {ar ? "تسجيل شركة جديدة" : "Register Your Company"}
            </h1>
            <p className="text-center text-slate-400 text-xs mb-6">
              Pay<span className="text-brand-600">Nest</span>
            </p>

            {/* Company Name */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "اسم الشركة" : "Company Name"}
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={set("companyName")}
              placeholder={ar ? "مثال: شركة النجوم" : "e.g. Stars Corp"}
              required
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {/* Slug */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "المعرّف (Slug)" : "Slug (unique ID)"}
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={set("slug")}
              onBlur={() => setSlugTouched(true)}
              placeholder="my-company"
              required
              dir="ltr"
              className={`w-full mb-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors bg-slate-50 focus:bg-white ${
                form.slug && !slugValid ? "border-red-400" : "border-slate-200"
              }`}
            />
            <p className="text-xs text-slate-400 mb-4">
              {ar
                ? "أحرف إنجليزية وأرقام وشرطة فقط — مثال: my-company"
                : "English letters, numbers, and hyphens only — e.g. my-company"}
            </p>

            {/* Owner Name */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "اسم المالك" : "Owner Name"}
            </label>
            <input
              type="text"
              value={form.ownerName}
              onChange={set("ownerName")}
              placeholder={ar ? "الاسم الكامل" : "Full name"}
              required
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {/* Email */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "البريد الإلكتروني" : "Email"}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="email@company.com"
              required
              dir="ltr"
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {/* Password */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "كلمة السر" : "Password"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder={ar ? "6 أحرف على الأقل" : "At least 6 characters"}
              required
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {/* Confirm Password */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "تأكيد كلمة السر" : "Confirm Password"}
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              placeholder={ar ? "أعد كتابة كلمة السر" : "Repeat password"}
              required
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {error && (
              <div className="text-red-600 text-sm mb-4 text-center bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {pending && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm text-center mb-4">
                {ar
                  ? "تم التسجيل بنجاح. سيتم مراجعة طلبك من قِبل الإدارة قريباً."
                  : "Registration submitted! Awaiting admin approval before you can log in."}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60 mb-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 transition-all shadow-sm text-sm"
            >
              {loading
                ? ar
                  ? "جاري التسجيل..."
                  : "Creating account..."
                : ar
                ? "إنشاء الحساب"
                : "Create Account"}
            </button>

            <p className="text-xs text-slate-400 text-center mt-3">
              {ar
                ? <span>بالتسجيل، أنت توافق على <button type="button" onClick={() => router.push("/terms")} className="underline hover:text-slate-600">شروط الاستخدام</button> و<button type="button" onClick={() => router.push("/privacy")} className="underline hover:text-slate-600">سياسة الخصوصية</button></span>
                : <span>By registering, you agree to our <button type="button" onClick={() => router.push("/terms")} className="underline hover:text-slate-600">Terms of Service</button> and <button type="button" onClick={() => router.push("/privacy")} className="underline hover:text-slate-600">Privacy Policy</button></span>
              }
            </p>

            <p className="text-center text-slate-400 text-xs mt-4">
              {ar ? "لديك حساب؟ " : "Already have an account? "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-brand-600 hover:underline font-medium"
              >
                {ar ? "سجّل دخولك" : "Sign in"}
              </button>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
