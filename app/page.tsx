"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Wallet, Clock, UserCircle, BarChart3, ShieldCheck, TrendingUp,
  Globe, LogIn, PlayCircle, CheckCircle2, Sparkles,
  Flower2, Sun, Sparkle, Diamond, Hexagon,
} from "lucide-react";
import clsx from "clsx";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useInView } from "@/lib/useInView";
import BrandLogo from "@/components/BrandLogo";

/* ─── Top navigation ─── */
function TopNav({ ar }: { ar: boolean }) {
  const router = useRouter();
  const { lang, toggleLanguage } = useLanguage();
  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-brand-100/70">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
        >
          <BrandLogo variant="row" markClass="h-9" textClass="h-5" />
        </button>

        <nav className="flex items-center" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleLanguage()}
            className="hidden sm:inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors px-2 py-1"
          >
            <Globe size={14} />
            {lang === "ar" ? "EN" : "AR"}
          </button>
          <Link
            href="/portal-select"
            className="text-slate-700 hover:text-slate-900 text-sm font-medium px-3 py-2 hidden sm:inline-flex items-center gap-1"
          >
            <LogIn size={14} />
            {ar ? "تسجيل الدخول" : "Log In"}
          </Link>
          <button
            onClick={() => router.push("/signup")}
            className="inline-flex items-center gap-1.5 bg-gradient-to-br from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
          >
            {ar ? "ابدأ الآن" : "Get Started"}
            <ArrowRight size={14} className={ar ? "rotate-180" : ""} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero ─── */
function Hero({ ar }: { ar: boolean }) {
  const router = useRouter();
  return (
    <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* Decorative background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(12,140,232,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.18) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Eyebrow chip */}
        <div className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-100 text-brand-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-6">
          <Sparkles size={13} />
          {ar ? "منصة الرواتب والموارد البشرية الشاملة" : "All-in-one Payroll & HR Platform"}
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.05] mb-6">
          {ar ? (
            <>
              فريقك.<br />
              رواتبك.<br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
                  نظام واحد.
                </span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="12"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8 Q 150 -2 298 8"
                    stroke="url(#hero-underline)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <defs>
                    <linearGradient id="hero-underline" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0c8ce8" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </>
          ) : (
            <>
              Your team.<br />
              Your payroll.<br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
                  One system.
                </span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="12"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8 Q 150 -2 298 8"
                    stroke="url(#hero-underline)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <defs>
                    <linearGradient id="hero-underline" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0c8ce8" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </>
          )}
        </h1>

        {/* Subhead */}
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-8">
          {ar
            ? "PayNest يجمع الرواتب والحضور والموارد البشرية والتقارير في منصة قوية واحدة — حتى تركّز على نمو أعمالك."
            : "PayNest brings payroll, attendance, HR, and reports together in one powerful platform — so you can focus on growing your business."}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-5">
          <button
            onClick={() => router.push("/signup")}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white text-base font-semibold px-6 py-3 rounded-xl shadow-elevated transition-all"
          >
            {ar ? "ابدأ الآن" : "Get Started"}
            <ArrowRight size={17} className={ar ? "rotate-180" : ""} />
          </button>
          <Link
            href="/portal-select"
            className="inline-flex items-center gap-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 text-base font-semibold px-6 py-3 rounded-xl shadow-sm transition-all"
          >
            <LogIn size={17} />
            {ar ? "تسجيل الدخول" : "Log In"}
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            {ar ? "بدون بطاقة ائتمان" : "No credit card"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            {ar ? "تشغيل خلال دقائق" : "Setup in minutes"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            {ar ? "إلغاء في أي وقت" : "Cancel anytime"}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─── Trust strip ─── */
function TrustStrip({ ar }: { ar: boolean }) {
  const logos = [
    { name: "TechNova",     icon: Hexagon  },
    { name: "Bright Future",icon: Flower2  },
    { name: "SmartPlus",    icon: Sparkle  },
    { name: "Golden Gate",  icon: Sun      },
    { name: "PrimeVision",  icon: Diamond  },
    { name: "NextWave",     icon: Sparkles },
  ];
  return (
    <section className="py-10 border-y border-brand-100/70 bg-white/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <p className="text-center text-xs font-semibold text-slate-500 mb-5 tracking-wide">
          {ar ? "موثوقة من شركات نامية" : "Trusted by growing businesses"}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-8">
          {logos.map((l) => (
            <div key={l.name} className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
              <l.icon size={20} className="text-slate-500" strokeWidth={1.5} />
              <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">{l.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Feature card ─── */
/* ─── Custom feature illustrations (on-brand SVG) ─── */
const ART_PAYROLL = (
  <svg viewBox="0 0 300 150" className="w-full block"><rect width="300" height="150" rx="14" fill="#e9f2fd" /><rect x="68" y="30" width="128" height="90" rx="10" fill="#fff" stroke="#cfe0f5" /><rect x="82" y="44" width="58" height="9" rx="4" fill="#0c8ce8" /><rect x="82" y="64" width="98" height="6" rx="3" fill="#dbe8f8" /><rect x="82" y="78" width="78" height="6" rx="3" fill="#dbe8f8" /><rect x="82" y="92" width="90" height="6" rx="3" fill="#dbe8f8" /><circle cx="206" cy="98" r="27" fill="#0c8ce8" /><circle cx="206" cy="98" r="27" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3 4" /><text x="206" y="108" textAnchor="middle" fontSize="28" fontWeight="800" fill="#fff" fontFamily="Georgia,serif">$</text></svg>
);
const ART_ATTENDANCE = (
  <svg viewBox="0 0 300 150" className="w-full block"><rect width="300" height="150" rx="14" fill="#e6f6ef" /><circle cx="146" cy="74" r="46" fill="#fff" stroke="#bfe6d4" strokeWidth="2" /><line x1="146" y1="34" x2="146" y2="40" stroke="#9fd9bf" strokeWidth="3" /><line x1="146" y1="108" x2="146" y2="114" stroke="#9fd9bf" strokeWidth="3" /><line x1="106" y1="74" x2="112" y2="74" stroke="#9fd9bf" strokeWidth="3" /><line x1="180" y1="74" x2="186" y2="74" stroke="#9fd9bf" strokeWidth="3" /><line x1="146" y1="74" x2="146" y2="48" stroke="#10b981" strokeWidth="4" strokeLinecap="round" /><line x1="146" y1="74" x2="168" y2="82" stroke="#10b981" strokeWidth="4" strokeLinecap="round" /><circle cx="146" cy="74" r="5" fill="#0f7a5c" /><circle cx="196" cy="106" r="17" fill="#10b981" /><path d="M188 106 l6 6 l10 -12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const ART_EMPLOYEE = (
  <svg viewBox="0 0 300 150" className="w-full block"><rect width="300" height="150" rx="14" fill="#f0eafb" /><rect x="76" y="34" width="148" height="84" rx="12" fill="#fff" stroke="#ddd0f4" /><circle cx="108" cy="68" r="17" fill="#7c3aed" /><circle cx="108" cy="63" r="6" fill="#fff" /><path d="M97 82 a11 9 0 0 1 22 0 z" fill="#fff" /><rect x="136" y="58" width="68" height="9" rx="4" fill="#7c3aed" /><rect x="136" y="74" width="52" height="6" rx="3" fill="#e3d8f7" /><rect x="92" y="98" width="116" height="6" rx="3" fill="#ede5fb" /></svg>
);
const ART_REPORTS = (
  <svg viewBox="0 0 300 150" className="w-full block"><rect width="300" height="150" rx="14" fill="#fdf2dd" /><line x1="66" y1="114" x2="236" y2="114" stroke="#ead79f" strokeWidth="2" /><rect x="84" y="82" width="24" height="32" rx="4" fill="#f4b740" /><rect x="118" y="64" width="24" height="50" rx="4" fill="#f59e0b" /><rect x="152" y="48" width="24" height="66" rx="4" fill="#f4b740" /><rect x="186" y="32" width="24" height="82" rx="4" fill="#f59e0b" /><polyline points="96,76 130,58 164,42 198,28" fill="none" stroke="#b3700a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="198" cy="28" r="5" fill="#b3700a" /></svg>
);
const ART_SECURITY = (
  <svg viewBox="0 0 300 150" className="w-full block"><rect width="300" height="150" rx="14" fill="#fdeef0" /><path d="M150 26 l38 15 v28 c0 29 -19 46 -38 56 c-19 -10 -38 -27 -38 -56 v-28 z" fill="#f43f5e" /><path d="M133 76 l12 13 l23 -28" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const ART_GROWTH = (
  <svg viewBox="0 0 300 150" className="w-full block"><rect width="300" height="150" rx="14" fill="#e6f4fc" /><polyline points="66,110 106,92 144,100 182,64 218,74 240,40" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><path d="M230 40 l10 0 l0 10" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="106" cy="92" r="4.5" fill="#0284c7" /><circle cx="182" cy="64" r="4.5" fill="#0284c7" /><circle cx="240" cy="40" r="5.5" fill="#0284c7" /></svg>
);

function FeatureCard({
  icon: Icon, title, desc, accent, art, delay = 0,
}: {
  icon: any; title: string; desc: string; accent: string; art?: React.ReactNode; delay?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={clsx(
        "group bg-white rounded-2xl p-3.5 border border-slate-200/70 hover:border-slate-300 hover:shadow-elevated transition-all duration-500 overflow-hidden",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {art && <div className="w-full rounded-xl overflow-hidden mb-3">{art}</div>}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent)}>
          <Icon size={16} strokeWidth={2.2} />
        </div>
        <h3 className="font-bold text-slate-900 text-base">{title}</h3>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed px-1">{desc}</p>
    </div>
  );
}

/* ─── Features grid ─── */
function Features({ ar }: { ar: boolean }) {
  const items = [
    {
      icon: Wallet,
      art: ART_PAYROLL,
      accent: "bg-brand-50 text-brand-600",
      title: ar ? "رواتب ذكية" : "Smart Payroll",
      desc: ar
        ? "احتساب دقيق للرواتب والخصومات والمكافآت والضرائب"
        : "Accurate salary calculations, deductions, bonuses, and taxes",
    },
    {
      icon: Clock,
      art: ART_ATTENDANCE,
      accent: "bg-emerald-50 text-emerald-600",
      title: ar ? "تتبع الحضور" : "Attendance Tracking",
      desc: ar
        ? "تتبع ساعات العمل، التأخير، الغيابات، والساعات الإضافية"
        : "Track work hours, late arrivals, absences, and overtime",
    },
    {
      icon: UserCircle,
      art: ART_EMPLOYEE,
      accent: "bg-violet-50 text-violet-600",
      title: ar ? "بوابة الموظف" : "Employee Portal",
      desc: ar
        ? "تمكين موظفيك من عرض كشوف الرواتب وطلب الإجازات"
        : "Empower your employees to view payslips, request leaves, and more",
    },
    {
      icon: BarChart3,
      art: ART_REPORTS,
      accent: "bg-amber-50 text-amber-600",
      title: ar ? "تقارير وتحليلات" : "Reports & Analytics",
      desc: ar
        ? "تقارير لحظية ورؤى لمساعدتك على اتخاذ قرارات أفضل"
        : "Real-time reports and insights to help you make better decisions",
    },
    {
      icon: ShieldCheck,
      art: ART_SECURITY,
      accent: "bg-rose-50 text-rose-600",
      title: ar ? "أمان وموثوقية" : "Secure & Reliable",
      desc: ar
        ? "وصول قائم على الصلاحيات، حماية البيانات، ومنصة قوية"
        : "Role-based access, data security, and a powerful platform",
    },
    {
      icon: TrendingUp,
      art: ART_GROWTH,
      accent: "bg-sky-50 text-sky-600",
      title: ar ? "صُمّم للنمو" : "Built for Growth",
      desc: ar
        ? "منصة قابلة للتوسع تنمو مع أعمالك"
        : "Scalable platform that grows with your business",
    },
  ];
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, i) => <FeatureCard key={i} {...it} delay={i * 60} />)}
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer({ ar }: { ar: boolean }) {
  const router = useRouter();
  const { toggleLanguage } = useLanguage();
  return (
    <footer className="border-t border-brand-100/70 py-8 bg-white/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          © 2026 PayNest — {ar ? "صُمم لشركات الشرق الأوسط" : "Built for MENA businesses"}
        </div>
        <div className="flex items-center gap-5 text-sm text-slate-500">
          <button onClick={() => router.push("/terms")} className="hover:text-slate-900 transition-colors">
            {ar ? "الشروط" : "Terms"}
          </button>
          <button onClick={() => router.push("/contact")} className="hover:text-slate-900 transition-colors">
            {ar ? "تواصل معنا" : "Contact"}
          </button>
          <button onClick={() => router.push("/about")} className="hover:text-slate-900 transition-colors">
            {ar ? "من نحن" : "About"}
          </button>
          <button onClick={() => router.push("/privacy")} className="hover:text-slate-900 transition-colors">
            {ar ? "الخصوصية" : "Privacy"}
          </button>
          <Link href="/portal-select" className="hover:text-slate-900 transition-colors">
            {ar ? "تسجيل الدخول" : "Log In"}
          </Link>
          <button onClick={() => router.push("/signup")} className="hover:text-slate-900 transition-colors">
            {ar ? "إنشاء حساب" : "Sign Up"}
          </button>
          <button onClick={() => toggleLanguage()} className="hover:text-slate-900 transition-colors inline-flex items-center gap-1">
            <Globe size={13} />
            {ar ? "English" : "العربية"}
          </button>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function Page() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  // The marketing landing is a light-themed page — keep it light even if the
  // app's dark mode is enabled (restore dark when navigating away).
  useEffect(() => {
    const html = document.documentElement;
    const had = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => { if (had) html.classList.add("dark"); };
  }, []);
  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-brand-50/60 text-slate-900">
      <TopNav ar={ar} />
      <Hero ar={ar} />
      <TrustStrip ar={ar} />
      <Features ar={ar} />
      <Footer ar={ar} />
    </div>
  );
}
