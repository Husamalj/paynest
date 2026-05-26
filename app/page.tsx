"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck, UserCircle, ArrowRight, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function LangToggle() {
  const { lang, toggleLanguage } = useLanguage();
  return (
    <button
      onClick={() => toggleLanguage()}
      className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
    >
      <Globe size={15} />
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const portals = [
    {
      label: ar ? "بوابة الموظفين والإدارة" : "Staff Portal",
      sub: ar ? "دخول المدير وموارد بشرية" : "Company Owner & HR Manager",
      icon: ShieldCheck,
      bg: "bg-gradient-to-br from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600",
      iconBg: "bg-white/20",
      textColor: "text-white",
      subColor: "text-brand-100",
      arrowColor: "text-brand-100",
      href: "/login",
      badge: ar ? "STAFF" : "STAFF",
    },
    {
      label: ar ? "بوابة الموظف" : "Employee Portal",
      sub: ar ? "كشف الراتب والإجازات والمهام" : "Payslips, leaves & tasks",
      icon: UserCircle,
      bg: "bg-slate-800 hover:bg-slate-700 border border-slate-700",
      iconBg: "bg-white/10",
      textColor: "text-white",
      subColor: "text-slate-400",
      arrowColor: "text-slate-400",
      href: "/employee-login",
      badge: ar ? "EMPLOYEE" : "EMPLOYEE",
    },
  ];

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 gap-10"
    >
      <div className="absolute top-4 right-4">
        <LangToggle />
      </div>

      <div className="text-center">
        <h1 className="text-4xl font-black text-white mb-2">
          Pay<span className="text-brand-400">Nest</span>
        </h1>
        <p className="text-slate-400 text-sm">
          {ar ? "نظام إدارة الرواتب والموارد البشرية" : "Payroll & HR Management System"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">
        {portals.map((p) => (
          <button
            key={p.href}
            onClick={() => router.push(p.href)}
            className={`group ${p.bg} transition-all duration-200 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl cursor-pointer`}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${p.iconBg}`}
            >
              <p.icon size={30} className={p.textColor} />
            </div>
            <div className="text-center">
              <div className={`${p.textColor} text-lg font-bold`}>{p.label}</div>
              <div className={`${p.subColor} text-xs mt-1`}>{p.sub}</div>
            </div>
            <div className={`flex items-center gap-2 ${p.arrowColor} text-sm mt-1`}>
              <span>{ar ? "تسجيل الدخول" : "Log In"}</span>
              <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => router.push("/signup")}
        className="text-slate-400 hover:text-brand-400 text-sm transition-colors"
      >
        {ar ? (
          <span>
            ليس لديك حساب؟{" "}
            <span className="underline">سجّل شركتك الآن</span>
          </span>
        ) : (
          <span>
            No account? <span className="underline">Register your company</span>
          </span>
        )}
      </button>
    </div>
  );
}
