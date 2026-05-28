"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function PricingPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  const plans = ar
    ? [
        {
          name: "المبتدئ",
          price: "مجاناً",
          sub: "للبدء",
          features: [
            "حتى 10 موظفين",
            "إدارة الرواتب الأساسية",
            "بوابة الموظف",
            "تتبع الحضور",
            "دعم عبر البريد الإلكتروني",
          ],
          cta: "ابدأ مجاناً",
          highlight: false,
        },
        {
          name: "الأعمال",
          price: "٤٩ دولار",
          sub: "شهرياً",
          features: [
            "حتى 100 موظف",
            "كل مميزات المبتدئ",
            "تقارير وتحليلات متقدمة",
            "إدارة الإجازات والمكافآت",
            "دعم ذو أولوية",
            "سجل التدقيق",
          ],
          cta: "ابدأ التجربة المجانية",
          highlight: true,
        },
        {
          name: "المؤسسات",
          price: "تواصل معنا",
          sub: "للشركات الكبيرة",
          features: [
            "موظفون غير محدودين",
            "كل مميزات الأعمال",
            "تكاملات مخصصة",
            "مدير حساب مخصص",
            "اتفاقية مستوى الخدمة (SLA)",
            "دعم على مدار الساعة",
          ],
          cta: "تواصل مع المبيعات",
          highlight: false,
        },
      ]
    : [
        {
          name: "Starter",
          price: "Free",
          sub: "to get started",
          features: [
            "Up to 10 employees",
            "Basic payroll management",
            "Employee portal",
            "Attendance tracking",
            "Email support",
          ],
          cta: "Get Started Free",
          highlight: false,
        },
        {
          name: "Business",
          price: "$49",
          sub: "per month",
          features: [
            "Up to 100 employees",
            "Everything in Starter",
            "Advanced reports & analytics",
            "Leaves & bonuses management",
            "Priority support",
            "Audit log",
          ],
          cta: "Start Free Trial",
          highlight: true,
        },
        {
          name: "Enterprise",
          price: "Contact us",
          sub: "for large teams",
          features: [
            "Unlimited employees",
            "Everything in Business",
            "Custom integrations",
            "Dedicated account manager",
            "SLA guarantee",
            "24/7 support",
          ],
          cta: "Contact Sales",
          highlight: false,
        },
      ];

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
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
        <div className="w-16" />
      </header>

      {/* Hero */}
      <section className="text-center py-14 px-4">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
          {ar ? "خطط الأسعار" : "Simple, Transparent Pricing"}
        </h1>
        <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
          {ar
            ? "ابدأ مجاناً وقم بالترقية عندما تكون مستعداً. لا رسوم خفية، لا مفاجآت."
            : "Start free and upgrade when you're ready. No hidden fees, no surprises."}
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-6 border flex flex-col gap-4 ${
              plan.highlight
                ? "bg-gradient-to-br from-brand-600 to-brand-700 border-transparent text-white shadow-elevated"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div>
              <div
                className={`text-sm font-bold uppercase tracking-wide mb-1 ${
                  plan.highlight ? "text-brand-100" : "text-slate-500"
                }`}
              >
                {plan.name}
              </div>
              <div className="text-3xl font-black">{plan.price}</div>
              <div
                className={`text-xs mt-0.5 ${
                  plan.highlight ? "text-brand-200" : "text-slate-400"
                }`}
              >
                {plan.sub}
              </div>
            </div>

            <ul className="space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2
                    size={15}
                    className={`mt-0.5 flex-shrink-0 ${
                      plan.highlight ? "text-brand-200" : "text-emerald-500"
                    }`}
                  />
                  <span className={plan.highlight ? "text-white/90" : "text-slate-600"}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => router.push("/signup")}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                plan.highlight
                  ? "bg-white text-brand-700 hover:bg-brand-50"
                  : "bg-brand-600 text-white hover:bg-brand-700"
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
