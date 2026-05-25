"use client";

import { useRouter } from "next/navigation";
import { Users, UserCircle, ArrowRight, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function LangToggle() {
  const { lang, toggleLanguage } = useLanguage();
  return (
    <button onClick={() => toggleLanguage()} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
      <Globe size={15} />
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 gap-10">
      <div className="absolute top-4 right-4"><LangToggle /></div>

      <div className="text-center">
        <h1 className="text-4xl font-black text-white mb-2">
          Pay<span className="text-blue-500">Nest</span>
        </h1>
        <p className="text-slate-400 text-sm">
          {ar ? "نظام إدارة الرواتب والموارد البشرية" : "Payroll & HR Management System"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        <button
          onClick={() => router.push("/hr-login")}
          className="flex-1 group bg-blue-600 hover:bg-blue-500 transition-all duration-200 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users size={32} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-white text-xl font-bold">{ar ? "بوابة الموارد البشرية" : "HR Portal"}</div>
            <div className="text-blue-100 text-sm mt-1">{ar ? "HR & إدارة الشركة" : "HR & Company Management"}</div>
          </div>
          <div className="flex items-center gap-2 text-blue-100 text-sm mt-2">
            <span>{ar ? "تسجيل الدخول" : "Log In"}</span>
            <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
          </div>
        </button>

        <button
          onClick={() => router.push("/employee-login")}
          className="flex-1 group bg-slate-800 hover:bg-slate-700 transition-all duration-200 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl cursor-pointer border border-slate-700"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <UserCircle size={32} className="text-slate-300" />
          </div>
          <div className="text-center">
            <div className="text-white text-xl font-bold">{ar ? "بوابة الموظف" : "Employee Portal"}</div>
            <div className="text-slate-400 text-sm mt-1">{ar ? "كشف الراتب والإجازات" : "Payslips & Leave Requests"}</div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm mt-2">
            <span>{ar ? "تسجيل الدخول" : "Log In"}</span>
            <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
          </div>
        </button>
      </div>

      <button onClick={() => router.push("/signup")} className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
        {ar
          ? <span>ليس لديك حساب؟ <span className="underline">سجّل شركتك الآن</span></span>
          : <span>No account? <span className="underline">Register your company</span></span>}
      </button>
    </div>
  );
}
