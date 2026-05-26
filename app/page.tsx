"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight, Sparkles, Wallet, Calendar, Users, Globe, LogIn,
} from "lucide-react";
import clsx from "clsx";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useInView } from "@/lib/useInView";

/* ─── Top nav ─── */
function TopNav({ ar }: { ar: boolean }) {
  const router = useRouter();
  const { lang, toggleLanguage } = useLanguage();
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200/70">
      <div className="max-w-6xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => router.push("/")}
          className="font-black text-lg text-slate-900 tracking-tight"
        >
          Pay<span className="text-brand-600">Nest</span>
        </button>

        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => toggleLanguage()}
            className="hidden sm:inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors px-2 py-1"
          >
            <Globe size={14} />
            {lang === "ar" ? "EN" : "AR"}
          </button>
          <button
            onClick={() => router.push("/portal-select")}
            className="btn btn-ghost btn-sm hidden sm:inline-flex"
          >
            <LogIn size={14} />
            {ar ? "تسجيل الدخول" : "Log In"}
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="btn btn-primary btn-sm"
          >
            {ar ? "ابدأ الآن" : "Get Started"}
            <ArrowRight size={14} className={ar ? "rotate-180" : ""} />
          </button>
        </nav>
      </div>
    </header>
  );
}

/* ─── Feature card with scroll-reveal ─── */
function FeatureCard({
  icon: Icon, iconBg, title, desc, delay,
}: {
  icon: any; iconBg: string; title: string; desc: string; delay: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ animationDelay: `${delay}ms` }}
      className={clsx(
        "card-interactive transition-all duration-500",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm mb-4", iconBg)}>
        <Icon size={22} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

/* ─── Landing page ─── */
export default function LandingPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-white text-slate-900">
      <TopNav ar={ar} />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Soft background gradient blobs */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(12, 140, 232, 0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
          {/* Eyebrow chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-6 border border-brand-100">
            <Sparkles size={12} />
            {ar ? "نظام الرواتب والموارد البشرية" : "Payroll & HR Management"}
          </div>

          {/* H1 */}
          <h1 className="font-caveat text-5xl sm:text-6xl md:text-7xl text-slate-900 leading-[1.1] mb-5">
            {ar ? (
              <>
                الرواتب والموارد البشرية،
                <br />
                <span
                  className="relative inline-block text-slate-900"
                  style={{
                    background: "linear-gradient(104deg, transparent 0.9%, #bae0fd 2.4%, #7cc7fc 97.9%, transparent 99%)",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "100% 88%",
                    backgroundPosition: "0 55%",
                    WebkitBoxDecorationBreak: "clone",
                    paddingInline: "0.15em",
                  }}
                >
                  ببساطة.
                </span>
              </>
            ) : (
              <>
                Payroll &amp; HR,
                <br />
                <span
                  className="relative inline-block text-slate-900"
                  style={{
                    background: "linear-gradient(104deg, transparent 0.9%, #bae0fd 2.4%, #7cc7fc 97.9%, transparent 99%)",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "100% 88%",
                    backgroundPosition: "0 55%",
                    WebkitBoxDecorationBreak: "clone",
                    paddingInline: "0.15em",
                  }}
                >
                  made simple.
                </span>
              </>
            )}
          </h1>

          {/* Subhead */}
          <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
            {ar
              ? "بسيط، فعّال، وبسعر مناسب — لكل شركة ناشئة في الأردن والخليج."
              : "Simple, efficient, yet affordable — built for every growing business in Jordan and the Gulf."}
          </p>

          {/* CTAs + playful arrow doodle */}
          <div className="relative inline-flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={() => router.push("/signup")}
              className="btn btn-primary btn-lg"
            >
              {ar ? "ابدأ مجاناً" : "Get Started — Free"}
              <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
            </button>
            <button
              onClick={() => router.push("/portal-select")}
              className="btn btn-secondary btn-lg"
            >
              <LogIn size={16} />
              {ar ? "تسجيل الدخول" : "Log In"}
            </button>

            {/* Handwritten note + arrow pointing from CTA to the note */}
            <span
              className={clsx(
                "absolute top-2 hidden md:block font-caveat text-brand-500 text-2xl leading-tight whitespace-nowrap",
                ar ? "-left-44" : "-right-44"
              )}
            >
              {ar ? (
                <>
                  مجاناً تماماً
                  <br />
                  بدون بطاقة
                </>
              ) : (
                <>
                  100% free —
                  <br />
                  no card needed
                </>
              )}
            </span>
            <svg
              aria-hidden
              viewBox="0 0 80 60"
              className={clsx(
                "absolute top-12 hidden md:block w-16 h-12 text-brand-400",
                ar ? "-left-24" : "-right-24",
                ar && "scale-x-[-1]"
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M70 10 C 55 5, 30 15, 10 40" />
              <path d="M15 32 L 8 42 L 20 45" />
            </svg>
          </div>

          {/* Trust line */}
          <div className="text-xs text-slate-400 flex items-center justify-center gap-2 flex-wrap">
            <span>{ar ? "موثوق به في" : "Trusted by businesses in"}</span>
            <span className="text-base" role="img" aria-label="flags">
              🇯🇴 🇸🇦 🇦🇪 🇰🇼
            </span>
          </div>
        </div>

        {/* ═══ PRODUCT PREVIEW ═══ */}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <div className="rounded-2xl border border-slate-200 shadow-elevated bg-white overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="flex-1 flex justify-center">
                <div className="text-[11px] text-slate-400 px-3 py-0.5 rounded-md bg-white border border-slate-200">
                  paynest.app/dashboard
                </div>
              </div>
            </div>

            {/* Mockup body */}
            <div className="aspect-[16/9] bg-gradient-to-br from-slate-50 via-white to-brand-50/40 p-6 sm:p-10 flex flex-col gap-4">
              {/* Fake stat cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: ar ? "الموظفون" : "Employees",  val: "248",  color: "bg-brand-500" },
                  { label: ar ? "الرواتب" : "Payroll",     val: "$84k", color: "bg-emerald-500" },
                  { label: ar ? "الإجازات" : "Leaves",     val: "12",   color: "bg-amber-500" },
                  { label: ar ? "المهام" : "Tasks",        val: "34",   color: "bg-violet-500" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-3 sm:p-4">
                    <div className={clsx("w-7 h-7 rounded-md mb-2", s.color)} />
                    <div className="text-base sm:text-xl font-bold text-slate-900">{s.val}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Fake table */}
              <div className="flex-1 bg-white rounded-xl border border-slate-200/80 shadow-sm p-3 sm:p-4 flex flex-col gap-2">
                <div className="h-3 w-32 bg-slate-200 rounded" />
                {[60, 80, 50, 70, 65].map((w, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="w-6 h-6 rounded-full bg-brand-100" />
                    <div className="h-2.5 bg-slate-100 rounded flex-1" style={{ maxWidth: `${w}%` }} />
                    <div className="h-2.5 w-16 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-3">
            {ar ? "نظرة على لوحة تحكم المدير" : "A glimpse of the owner dashboard."}
          </p>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
            {ar ? "كل ما تحتاجه. في مكان واحد." : "Everything you need. In one place."}
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            {ar
              ? "ثلاث أدوات قوية تعمل معاً لإدارة فريقك بسهولة."
              : "Three powerful tools, working together to manage your team effortlessly."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            icon={Wallet}
            iconBg="bg-brand-500"
            title={ar ? "حساب رواتب ذكي" : "Smart Payroll"}
            desc={ar
              ? "حساب الرواتب والخصومات والمكافآت تلقائياً مع تقارير شهرية كاملة."
              : "Auto-calculate salaries, deductions and bonuses with full monthly reports."}
            delay={0}
          />
          <FeatureCard
            icon={Calendar}
            iconBg="bg-emerald-500"
            title={ar ? "الحضور والإجازات" : "Time & Attendance"}
            desc={ar
              ? "ارفع ملفات الحضور، تابع ساعات العمل، وأدِر طلبات الإجازة بنقرة."
              : "Upload attendance sheets, track hours, and manage leaves in one click."}
            delay={120}
          />
          <FeatureCard
            icon={Users}
            iconBg="bg-violet-500"
            title={ar ? "فرق ومهام" : "Teams & Tasks"}
            desc={ar
              ? "أضف موظفين ومدراء HR، وزّع المهام، وشارك إعلانات الشركة."
              : "Add employees and HR managers, assign tasks, and share announcements."}
            delay={240}
          />
        </div>
      </section>

      {/* ═══ CTA STRIP ═══ */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">
            {ar ? "جاهز للبدء؟" : "Ready to get started?"}
          </h2>
          <p className="text-slate-500 mb-7">
            {ar
              ? "سجل شركتك خلال دقيقتين وابدأ بإدارة الرواتب والحضور اليوم."
              : "Register your company in two minutes and start managing payroll today."}
          </p>
          <div className="inline-flex flex-col sm:flex-row gap-3">
            <button onClick={() => router.push("/signup")} className="btn btn-primary btn-lg">
              {ar ? "سجّل شركتك" : "Register your company"}
              <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
            </button>
            <button onClick={() => router.push("/portal-select")} className="btn btn-secondary btn-lg">
              {ar ? "لديّ حساب" : "I already have an account"}
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} PayNest · {ar ? "مصمّم للأعمال في الشرق الأوسط" : "Built for MENA businesses"}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => router.push("/portal-select")} className="text-slate-500 hover:text-slate-900 transition-colors">
              {ar ? "تسجيل الدخول" : "Log In"}
            </button>
            <span className="text-slate-300">·</span>
            <button onClick={() => router.push("/signup")} className="text-slate-500 hover:text-slate-900 transition-colors">
              {ar ? "تسجيل" : "Sign Up"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
