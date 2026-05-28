"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck, UserCircle, ArrowRight, ArrowLeft, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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

export default function PortalSelectPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  const portals = [
    {
      key: "staff",
      label: ar ? "بوابة الموظفين والإدارة" : "Staff Portal",
      sub: ar ? "السوبر أدمن، المدير، والموارد البشرية" : "Super Admin, Owner & HR Manager",
      icon: ShieldCheck,
      iconBg: "bg-brand-600",
      ring: "hover:ring-brand-300",
      href: "/login",
    },
    {
      key: "employee",
      label: ar ? "بوابة الموظف" : "Employee Portal",
      sub: ar ? "كشف الراتب والإجازات والمهام" : "Payslips, leaves & tasks",
      icon: UserCircle,
      iconBg: "bg-slate-700",
      ring: "hover:ring-slate-300",
      href: "/employee-login",
    },
  ];

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col bg-slate-50"
    >
      {/* Slim header */}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <Back size={16} />
          {ar ? "الرئيسية" : "Home"}
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
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              {ar ? "اختر نوع الحساب" : "Choose your portal"}
            </h1>
            <p className="text-slate-500 text-sm">
              {ar
                ? "اختر البوابة المناسبة لنوع حسابك"
                : "Select the portal that matches your account type"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {portals.map((p) => (
              <button
                key={p.key}
                onClick={() => router.push(p.href)}
                className={`group bg-white border border-slate-200 ${p.ring} hover:ring-4 hover:-translate-y-1 rounded-2xl p-6 flex flex-col items-start gap-4 shadow-card hover:shadow-card-hover transition-all text-left`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${p.iconBg} text-white flex items-center justify-center group-hover:scale-105 transition-transform`}
                >
                  <p.icon size={22} />
                </div>
                <div className="min-w-0">
                  <div className="text-slate-900 text-lg font-bold leading-tight">{p.label}</div>
                  <div className="text-slate-500 text-xs mt-1">{p.sub}</div>
                </div>
                <div className="flex items-center gap-1.5 text-brand-600 text-sm font-semibold mt-auto group-hover:gap-2.5 transition-all">
                  {ar ? "تسجيل الدخول" : "Continue"}
                  <ArrowRight size={14} className={ar ? "rotate-180" : ""} />
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            {ar ? "ليس لديك حساب؟ " : "Don't have an account? "}
            <button
              onClick={() => router.push("/signup")}
              className="text-brand-600 hover:underline font-semibold"
            >
              {ar ? "سجّل شركتك" : "Register your company"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
