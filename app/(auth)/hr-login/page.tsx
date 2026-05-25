"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ArrowRight, Eye, EyeOff, Globe } from "lucide-react";
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

export default function HRLoginPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;

      if (user.role === "employee") {
        setError(ar ? "هذا الحساب مخصص لبوابة الموظف" : "This account belongs to the Employee Portal");
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
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="absolute top-4 right-4"><LangToggle /></div>
      <div className="w-full max-w-md">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowRight size={16} className={ar ? "rotate-0" : "rotate-180"} />
          {ar ? "العودة للرئيسية" : "Back"}
        </button>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-center text-slate-900 mb-1">
            {ar ? "بوابة الموارد البشرية" : "HR Portal"}
          </h1>
          <p className="text-center text-slate-500 text-sm mb-6">Pay<span className="text-blue-600">Nest</span></p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={ar ? "البريد الإلكتروني" : "Email address"}
            required
            className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="ltr"
          />
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={ar ? "كلمة السر" : "Password"}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              dir="ltr"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="text-red-600 text-sm mb-4 text-center">{error}</div>}

          <button disabled={loading} className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60 mb-4 bg-blue-600 hover:bg-blue-700 transition-colors">
            {loading ? (ar ? "جاري الدخول..." : "Signing in...") : (ar ? "دخول" : "Sign In")}
          </button>

          <p className="text-center text-slate-500 text-sm mt-4">
            {ar ? "ليس لديك حساب؟ " : "Don't have an account? "}
            <button type="button" onClick={() => router.push("/signup")} className="text-blue-600 hover:underline font-medium">
              {ar ? "سجّل شركتك" : "Register your company"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
