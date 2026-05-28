"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Target, Users, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function AboutPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-50">
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{ar ? "من نحن" : "About PayNest"}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{ar ? "صُمّد لشركات الشرق الأوسط" : "Built for MENA businesses"}</p>
          </div>
        </div>

        <div className="space-y-10">
          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target size={18} className="text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">{ar ? "مهمتنا" : "Our Mission"}</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {ar
                ? "نؤمن بأن إدارة الرواتب والموارد البشرية يجب أن تكون بسيطة وموثوقة لكل شركة في منطقة الشرق الأوسط. PayNest يجمع كل ما تحتاجه في منصة واحدة متكاملة."
                : "We believe payroll and HR management should be simple and reliable for every company in the MENA region. PayNest brings everything you need into one integrated platform."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{ar ? "ماذا نقدم" : "What We Do"}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Users, title: ar ? "إدارة الموظفين" : "Employee Management", desc: ar ? "إدارة كاملة لملفات الموظفين، الحضور، والإجازات" : "Complete employee records, attendance, and leave management" },
                { icon: Globe, title: ar ? "رواتب ذكية" : "Smart Payroll", desc: ar ? "احتساب دقيق للرواتب مع دعم للبدلات والخصومات" : "Accurate payroll with support for allowances and deductions" },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                  <item.icon size={18} className="text-brand-600 mb-3" />
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gradient-to-br from-brand-50 to-brand-100/50 rounded-2xl border border-brand-100 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">{ar ? "لمن صُمّم PayNest؟" : "Who is PayNest for?"}</h2>
            <p className="text-slate-600 leading-relaxed">
              {ar
                ? "صُمّمت PayNest للشركات متوسطة الحجم (٢٠–٢٠٠ موظف) التي تحتاج إلى نظام موارد بشرية ورواتب قوي. مثالية للشركات في الأردن والمملكة العربية السعودية والإمارات وسائر دول المنطقة."
                : "PayNest is designed for mid-size companies (20–200 employees) that need a powerful HR and payroll system. Ideal for businesses in Jordan, Saudi Arabia, UAE, and across the MENA region."}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
