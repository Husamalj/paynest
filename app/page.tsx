"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Wallet, Clock, BarChart3, ShieldCheck, Users, Calendar,
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
              شغّل الرواتب<br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
                  بشكل لم تختبره من قبل
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
              Payroll.<br />
              Employees.<br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
                  One System.
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
            ? "PayNest يحوّل فوضى الرواتب إلى وضوح — الحضور والرواتب والموارد البشرية في منصّة واحدة سهلة مصمَّمة للفرق العصرية."
            : "PayNest turns payroll chaos into clarity — attendance, salaries, and HR in one simple platform built for modern teams."}
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
function FeatureCard({
  icon: Icon, title, desc, delay = 0,
}: {
  icon: any; title: string; desc: string; delay?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={clsx(
        "group bg-gradient-to-b from-white to-slate-50/60 rounded-2xl p-6 border border-slate-200/70 hover:border-slate-300 hover:shadow-elevated transition-all duration-500",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
        <Icon size={20} strokeWidth={2} />
      </div>
      <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

/* ─── Features grid ─── */
function Features({ ar }: { ar: boolean }) {
  const items = [
    {
      icon: Users,
      title: ar ? "إدارة الموظفين" : "Employee Management",
      desc: ar
        ? "مركزية لسجلات الموظفين والعقود والوثائق، مع تعيين سريع وهيكل تنظيمي واضح."
        : "Centralize employee records, contracts, and documents — with quick onboarding and a clear org structure.",
    },
    {
      icon: Clock,
      title: ar ? "تتبع الحضور" : "Attendance Tracking",
      desc: ar
        ? "تتبّع ساعات العمل والتأخير والغيابات والساعات الإضافية من ملفات الحضور."
        : "Track work hours, late arrivals, absences, and overtime from your attendance imports.",
    },
    {
      icon: Wallet,
      title: ar ? "أتمتة الرواتب" : "Payroll Automation",
      desc: ar
        ? "احسب الرواتب والخصومات والمكافآت والضمان في تشغيلة واحدة، مع كشف راتب لكل موظف."
        : "Calculate salaries, deductions, bonuses, and social security in one run — with a payslip for every employee.",
    },
    {
      icon: Calendar,
      title: ar ? "إدارة الإجازات" : "Leave Management",
      desc: ar
        ? "أنواع إجازات مخصّصة، تسلسل موافقات، تقويم عطل، وتتبّع أرصدة تلقائي."
        : "Custom leave types, approval chains, holiday calendars, and automatic balance tracking.",
    },
    {
      icon: BarChart3,
      title: ar ? "التقارير والتحليلات" : "Reports & Analytics",
      desc: ar
        ? "تقارير لحظية للرواتب والتكاليف وأعداد الموظفين تساعدك على اتخاذ قرارات أفضل."
        : "Real-time payroll, cost, and headcount reports to help you make better decisions.",
    },
    {
      icon: ShieldCheck,
      title: ar ? "الأمان والصلاحيات" : "Security & Access",
      desc: ar
        ? "وصول قائم على الصلاحيات، عزل تام لبيانات كل شركة، وسجل تدقيق كامل."
        : "Role-based access, fully isolated company data, and complete audit trails.",
    },
  ];
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-sm font-bold text-brand-600 mb-3">{ar ? "كل ما تحتاجه" : "Everything you need"}</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            {ar ? "منصّة واحدة لكل دورة حياة الموظف" : "One platform for the entire employee lifecycle"}
          </h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
            {ar
              ? "من التعيين حتى نهاية الخدمة — استبدل ملفات الإكسل والأدوات المتفرّقة والعمل اليدوي."
              : "From hire to retire — replace the spreadsheets, the disconnected tools, and the manual work."}
          </p>
        </div>
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
/* ─── Analytics showcase (text + product preview) ─── */
function AnalyticsShowcase({ ar }: { ar: boolean }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15);
  const bullets = ar
    ? ["مؤشرات لحظية للرواتب والموظفين", "تفصيل لكل قسم ولكل موظف", "رؤى للمكافآت والخصومات والحضور", "تصدير التقارير إلى Excel بضغطة"]
    : ["Live payroll, headcount, and cost metrics", "Per-department and per-employee breakdowns", "Bonuses, deductions, and attendance insights", "One-click export to Excel"];
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-brand-50/40">
      <div ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Copy */}
        <div dir={ar ? "rtl" : "ltr"} className={clsx("transition-all duration-700", inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}>
          <div className="text-sm font-bold text-brand-600 mb-3">{ar ? "لوحة التحليلات" : "Analytics Dashboard"}</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            {ar ? "قرارات مبنية على بيانات لحظية" : "Decisions backed by real-time people data"}
          </h2>
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-6">
            {ar
              ? "تابِع أعداد الموظفين وإنفاق الرواتب والخصومات والحضور لكل فريق — وانتقل من الإجمالي على مستوى الشركة حتى موظف واحد بضغطتين."
              : "Track headcount, payroll spend, deductions, and attendance across every team — and drill from a company-wide total down to a single employee in two clicks."}
          </p>
          <ul className="space-y-3">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-center gap-2.5 text-slate-700">
                <CheckCircle2 size={18} className="text-brand-600 flex-shrink-0" />
                <span className="text-sm sm:text-base">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Product preview (swap the <img> src for a real screenshot anytime) */}
        <div className={clsx("relative transition-all duration-700 delay-150", inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <div className="absolute -inset-6 bg-gradient-to-tr from-brand-200/40 to-violet-200/30 blur-2xl rounded-[2rem]" />
          <img
            src="/analytics-preview.png"
            alt={ar ? "لوحة تحكم PayNest" : "PayNest dashboard"}
            className="relative w-full rounded-2xl shadow-elevated"
          />
        </div>
      </div>
    </section>
  );
}

/* ─── Contact / demo request ─── */
function ContactSection({ ar }: { ar: boolean }) {
  const empty = { firstName: "", lastName: "", email: "", company: "", teamSize: "1–25", message: "", website: "" };
  const [form, setForm] = useState({ ...empty });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending"); setErr("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed"); }
      setStatus("sent"); setForm({ ...empty });
    } catch (e: any) { setStatus("error"); setErr(e.message || (ar ? "صار خطأ" : "Something went wrong")); }
  };

  const label = "block text-sm font-semibold text-slate-700 mb-1.5";
  const field = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition";

  return (
    <section className="py-16 sm:py-24" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* Left: copy + contact details */}
        <div>
          <div className="text-sm font-bold text-brand-600 mb-3">{ar ? "تواصل معنا" : "Get in touch"}</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            {ar ? "تحدّث مع فريقنا" : "Talk to our team"}
          </h2>
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-10 max-w-md">
            {ar
              ? "شوف PayNest على أرض الواقع. احكيلنا عن فريقك، وبيتواصل معك مختص يعرضلك عرضاً مخصّصاً خلال 24 ساعة."
              : "See PayNest in action. Tell us about your team, and a specialist will walk you through a tailored demo within 24 hours."}
          </p>
          <div className="space-y-6">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "المبيعات" : "Sales"}</div>
              <a href="mailto:sales@paynest.app" className="font-semibold text-slate-900 hover:text-brand-600" dir="ltr">sales@paynest.app</a>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "الدعم" : "Support"}</div>
              <a href="mailto:support@paynest.app" className="font-semibold text-slate-900 hover:text-brand-600" dir="ltr">support@paynest.app</a>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "المقر" : "Headquarters"}</div>
              <div className="font-semibold text-slate-900">{ar ? "عمّان، الأردن · نخدم منطقة الشرق الأوسط" : "Amman, Jordan · Serving the MENA region"}</div>
            </div>
          </div>
        </div>

        {/* Right: form card */}
        <div className="bg-white rounded-2xl shadow-elevated border border-slate-100 p-6 sm:p-8">
          {status === "sent" ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4"><CheckCircle2 size={28} /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{ar ? "وصلنا طلبك!" : "Request received!"}</h3>
              <p className="text-sm text-slate-500">{ar ? "بنتواصل معك خلال 24 ساعة." : "We'll be in touch within 24 hours."}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input type="text" name="website" value={form.website} onChange={set("website")} className="hidden" tabIndex={-1} autoComplete="off" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={label}>{ar ? "الاسم الأول" : "First name"}</label><input className={field} value={form.firstName} onChange={set("firstName")} required /></div>
                <div><label className={label}>{ar ? "اسم العائلة" : "Last name"}</label><input className={field} value={form.lastName} onChange={set("lastName")} /></div>
              </div>
              <div><label className={label}>{ar ? "البريد الإلكتروني للعمل" : "Work email"}</label><input type="email" dir="ltr" className={field} value={form.email} onChange={set("email")} required /></div>
              <div><label className={label}>{ar ? "الشركة" : "Company"}</label><input className={field} value={form.company} onChange={set("company")} /></div>
              <div>
                <label className={label}>{ar ? "حجم الفريق" : "Team size"}</label>
                <select className={field} value={form.teamSize} onChange={set("teamSize")}>
                  {["1–25", "26–100", "101–500", "500+"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div><label className={label}>{ar ? "كيف نقدر نساعدك؟" : "How can we help?"}</label><textarea rows={4} className={field} value={form.message} onChange={set("message")} /></div>
              {status === "error" && <div className="text-sm text-rose-600">{err}</div>}
              <button type="submit" disabled={status === "sending"} className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl shadow-elevated transition-all">
                {status === "sending" ? (ar ? "جاري الإرسال..." : "Sending...") : (ar ? "اطلب عرضاً توضيحياً" : "Request a demo")}
                {status !== "sending" && <ArrowRight size={17} className={ar ? "rotate-180" : ""} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

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
      <AnalyticsShowcase ar={ar} />
      <ContactSection ar={ar} />
      <Footer ar={ar} />
    </div>
  );
}
