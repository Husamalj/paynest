"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, ArrowLeft, Eye, EyeOff, Globe } from "lucide-react";
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

export default function StaffLoginPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;

      if (user.role === "employee") {
        setError(
          ar
            ? "هذه البوابة ليست للموظفين. يرجى استخدام بوابة الموظف."
            : "This portal is not for employees. Please use the Employee Portal."
        );
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("paynest_logged_in", "true");
      localStorage.setItem("role", user.role);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.must_change_password === true) {
        window.location.href = "/force-change-password";
        return;
      }

      if (user.role === "super_admin") {
        window.location.href = "/super-admin";
      } else if (user.role === "owner") {
        window.location.href = "/owner-portal";
      } else {
        window.location.href = "/dashboard";
      }
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
      {/* Soft brand radial blob — matches landing hero */}
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
          onClick={() => router.push("/portal-select")}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <Back size={16} />
          {ar ? "رجوع" : "Back"}
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
            onSubmit={handleLogin}
            className="bg-white rounded-2xl shadow-elevated border border-slate-200/70 p-8"
          >
            {/* Icon + title */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-center text-slate-900 mb-1">
              {ar ? "بوابة الموظفين والإدارة" : "Staff Portal"}
            </h1>
            <p className="text-center text-slate-400 text-xs mb-6">
              {ar ? "للمدراء وموارد بشرية والسوبر أدمن" : "Super Admin, Company Owners & HR Managers"}
            </p>

            {/* Email */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "البريد الإلكتروني" : "Email Address"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@company.com"
              required
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
              dir="ltr"
            />

            {/* Password */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "كلمة السر" : "Password"}
            </label>
            <div className="relative mb-4">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 pr-11 text-sm transition-colors"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="text-red-600 text-sm mb-4 text-center bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60 mb-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 transition-all shadow-sm text-sm"
            >
              {loading
                ? ar ? "جاري الدخول..." : "Signing in..."
                : ar ? "دخول" : "Sign In"}
            </button>

            <p className="text-center text-slate-400 text-xs">
              {ar ? "بوابة الموظف؟ " : "Employee? "}
              <button
                type="button"
                onClick={() => router.push("/employee-login")}
                className="text-brand-600 hover:underline font-medium"
              >
                {ar ? "اضغط هنا" : "Click here"}
              </button>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
