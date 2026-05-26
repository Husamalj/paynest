"use client";

import { useRouter } from "next/navigation";
import { Building2, Users, UserCircle, ArrowRight, Globe } from "lucide-react";
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

  const portals = [
    {
      label: ar ? "مدير الشركة" : "Company Owner",
      sub: ar ? "التقارير المالية والرواتب والإعدادات" : "Financials, payroll & settings",
      icon: Building2,
      bg: "bg-violet-600 hover:bg-violet-500",
      iconBg: "bg-white/20",
      textColor: "text-white",
      subColor: "text-violet-100",
      arrowColor: "text-violet-100",
      href: "/owner-login",
      badge: ar ? "OWNER" : "OWNER",
    },
    {
      label: ar ? "الموارد البشرية" : "HR Manager",
      sub: ar ? "الموظفون والإجازات والمهام" : "Employees, leaves & tasks",
      icon: Users,
      bg: "bg-blue-600 hover:bg-blue-500",
      iconBg: "bg-white/20",
      textColor: "text-white",
      subColor: "text-blue-100",
      arrowColor: "text-blue-100",
      href: "/hr-login",
      badge: "HR",
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
        {portals.map((p) => (
          <button
            key={p.label}
            onClick={() => router.push(p.href)}
            className={`group ${p.bg} transition-all duration-200 rounded-3xl p-7 flex flex-col items-center gap-4 shadow-2xl cursor-pointer`}
          >
            <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", p.iconBg)}>
              <p.icon size={28} className={p.textColor} />
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

      <button onClick={() => router.push("/signup")} className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
        {ar
          ? <span>ليس لديك حساب؟ <span className="underline">سجّل شركتك الآن</span></span>
          : <span>No account? <span className="underline">Register your company</span></span>}
      </button>
    </div>
  );
}

function clsx(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
