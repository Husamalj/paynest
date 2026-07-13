"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  Globe2,
  KeyRound,
  Languages,
  Layers3,
  LineChart,
  LockKeyhole,
  Mail,
  Menu,
  MonitorSmartphone,
  Network,
  PieChart,
  PlugZap,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users2,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Copy = {
  en: string;
  ar: string;
};

type IconType = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

function tx(copy: Copy, ar: boolean) {
  return ar ? copy.ar : copy.en;
}

const navItems = [
  { label: { en: "Product", ar: "المنتج" }, href: "#product" },
  { label: { en: "Solutions", ar: "الحلول" }, href: "#solutions" },
  { label: { en: "Features", ar: "الميزات" }, href: "#features" },
  { label: { en: "Pricing", ar: "الأسعار" }, href: "#pricing" },
  { label: { en: "Resources", ar: "الموارد" }, href: "#resources" },
  { label: { en: "About", ar: "من نحن" }, href: "/about" },
  { label: { en: "Contact", ar: "تواصل" }, href: "/contact" },
];

const trustSignals = [
  { icon: ShieldCheck, en: "Role-based access", ar: "صلاحيات حسب الدور" },
  { icon: Building2, en: "Multi-company support", ar: "دعم عدة شركات" },
  { icon: Globe2, en: "Arabic and English", ar: "عربي وإنجليزي" },
  { icon: FileSpreadsheet, en: "Excel and CSV ready", ar: "جاهز لـ Excel و CSV" },
  { icon: Fingerprint, en: "Attendance device workflow", ar: "تدفق أجهزة الحضور" },
];

const productModules = [
  {
    icon: Users2,
    title: { en: "HR Management", ar: "إدارة الموارد البشرية" },
    body: {
      en: "Centralize employee profiles, documents, contracts, departments, and job roles from onboarding to offboarding.",
      ar: "اجمع ملفات الموظفين والوثائق والعقود والأقسام والمسميات الوظيفية من التعيين حتى نهاية الخدمة.",
    },
    points: [
      { en: "Employee records and contracts", ar: "سجلات الموظفين والعقود" },
      { en: "Departments and job roles", ar: "الأقسام والمسميات الوظيفية" },
      { en: "Lifecycle visibility", ar: "رؤية واضحة لدورة حياة الموظف" },
    ],
  },
  {
    icon: WalletCards,
    title: { en: "Payroll Automation", ar: "أتمتة الرواتب" },
    body: {
      en: "Run salary calculations with overtime, deductions, allowances, bonuses, commissions, payslips, and exportable reports.",
      ar: "شغل حسابات الرواتب مع الإضافي والخصومات والعلاوات والمكافآت والعمولات وكشوف الرواتب والتقارير.",
    },
    points: [
      { en: "Salary and net pay calculations", ar: "حساب الراتب والصافي" },
      { en: "Deductions, bonuses, and allowances", ar: "خصومات ومكافآت وعلاوات" },
      { en: "Payslips and payroll reports", ar: "كشوف رواتب وتقارير" },
    ],
  },
  {
    icon: Clock3,
    title: { en: "Attendance Management", ar: "إدارة الحضور" },
    body: {
      en: "Track attendance, shifts, lateness, overtime, and biometric imports with ZKTeco-ready workflows where configured.",
      ar: "تابع الحضور والورديات والتأخير والإضافي واستيراد أجهزة البصمة مع تدفقات جاهزة عند تفعيلها.",
    },
    points: [
      { en: "Attendance imports", ar: "استيراد الحضور" },
      { en: "Lateness and overtime", ar: "التأخير والإضافي" },
      { en: "Shift visibility", ar: "رؤية أوضح للورديات" },
    ],
  },
  {
    icon: CalendarDays,
    title: { en: "Leave Management", ar: "إدارة الإجازات" },
    body: {
      en: "Handle leave requests, approval workflows, balances, holidays, and manager review from one organized flow.",
      ar: "أدر طلبات الإجازات وسلاسل الموافقة والأرصدة والعطل ومراجعة المديرين من مسار واحد منظم.",
    },
    points: [
      { en: "Requests and approvals", ar: "طلبات وموافقات" },
      { en: "Leave balances", ar: "أرصدة الإجازات" },
      { en: "Holiday calendars", ar: "تقويم العطل" },
    ],
  },
  {
    icon: MonitorSmartphone,
    title: { en: "Employee Self-Service", ar: "بوابة الخدمة الذاتية" },
    body: {
      en: "Give employees secure access to profiles, payslips, leave balances, requests, notifications, and assigned tasks.",
      ar: "امنح الموظفين وصولاً آمناً للملف الشخصي وكشوف الرواتب والأرصدة والطلبات والإشعارات والمهام.",
    },
    points: [
      { en: "Payslip access", ar: "الوصول لكشوف الرواتب" },
      { en: "Leave and custom requests", ar: "طلبات الإجازة والطلبات الخاصة" },
      { en: "Tasks and notifications", ar: "المهام والإشعارات" },
    ],
  },
  {
    icon: BarChart3,
    title: { en: "Analytics and Reports", ar: "التحليلات والتقارير" },
    body: {
      en: "Understand payroll cost, headcount, attendance trends, department performance, and exportable business reports.",
      ar: "افهم تكلفة الرواتب وعدد الموظفين واتجاهات الحضور وأداء الأقسام والتقارير القابلة للتصدير.",
    },
    points: [
      { en: "Payroll summaries", ar: "ملخصات الرواتب" },
      { en: "Department insights", ar: "رؤى حسب القسم" },
      { en: "Exportable reporting", ar: "تقارير قابلة للتصدير" },
    ],
  },
];

const portalTabs = [
  {
    key: "owner",
    icon: BriefcaseBusiness,
    title: { en: "Business Owners", ar: "أصحاب الشركات" },
    benefit: { en: "A clear command center for workforce cost and company performance.", ar: "مركز قيادة واضح لتكلفة القوى العاملة وأداء الشركة." },
    tools: [
      { en: "Company overview", ar: "نظرة عامة على الشركة" },
      { en: "Payroll summaries", ar: "ملخصات الرواتب" },
      { en: "Team and HR visibility", ar: "رؤية للفريق والموارد البشرية" },
    ],
  },
  {
    key: "hr",
    icon: UserRoundCheck,
    title: { en: "HR Teams", ar: "فرق الموارد البشرية" },
    benefit: { en: "Daily HR operations without scattered spreadsheets or repeated manual work.", ar: "عمليات موارد بشرية يومية بدون ملفات متفرقة أو عمل يدوي متكرر." },
    tools: [
      { en: "Employees and documents", ar: "الموظفون والوثائق" },
      { en: "Leaves and attendance", ar: "الإجازات والحضور" },
      { en: "Approvals and requests", ar: "الموافقات والطلبات" },
    ],
  },
  {
    key: "employee",
    icon: MonitorSmartphone,
    title: { en: "Employees", ar: "الموظفون" },
    benefit: { en: "Self-service access that reduces repetitive HR questions.", ar: "خدمة ذاتية تقلل أسئلة الموارد البشرية المتكررة." },
    tools: [
      { en: "Payslips", ar: "كشوف الرواتب" },
      { en: "Leave balances", ar: "أرصدة الإجازات" },
      { en: "Requests and tasks", ar: "الطلبات والمهام" },
    ],
  },
  {
    key: "super",
    icon: ShieldCheck,
    title: { en: "PayNest Super Admin", ar: "مدير PayNest العام" },
    benefit: { en: "Control companies, subscription state, access, and platform operations.", ar: "تحكم بالشركات وحالة الاشتراك والوصول وعمليات المنصة." },
    tools: [
      { en: "Company approvals", ar: "موافقات الشركات" },
      { en: "Page visibility", ar: "إظهار وإخفاء الصفحات" },
      { en: "Tenant controls", ar: "تحكم بالمستأجرين" },
    ],
  },
];

const workflow = [
  { en: "Add your company", ar: "أضف شركتك" },
  { en: "Import employees", ar: "استورد الموظفين" },
  { en: "Configure attendance and payroll rules", ar: "اضبط قواعد الحضور والرواتب" },
  { en: "Track attendance and requests", ar: "تابع الحضور والطلبات" },
  { en: "Review and approve payroll", ar: "راجع واعتمد الرواتب" },
  { en: "Generate reports and payslips", ar: "أنشئ التقارير وكشوف الرواتب" },
];

const integrations = [
  { icon: Fingerprint, name: "ZKTeco", status: { en: "Available when configured", ar: "متاح عند الإعداد" } },
  { icon: Fingerprint, name: "Biometric devices", status: { en: "Available when configured", ar: "متاح عند الإعداد" } },
  { icon: FileSpreadsheet, name: "Excel / CSV", status: { en: "Available", ar: "متاح" } },
  { icon: Mail, name: "Email notifications", status: { en: "Available", ar: "متاح" } },
  { icon: ReceiptText, name: "Payroll reports", status: { en: "Available", ar: "متاح" } },
  { icon: Database, name: "Banking exports", status: { en: "Planned", ar: "مخطط" } },
  { icon: PlugZap, name: "REST APIs", status: { en: "In development", ar: "قيد التطوير" } },
  { icon: FileText, name: "Accounting integrations", status: { en: "Coming soon", ar: "قريباً" } },
];

const faqs = [
  {
    q: { en: "What is PayNest?", ar: "ما هو PayNest؟" },
    a: {
      en: "PayNest is a web-based HR and payroll platform for managing employees, attendance, leave requests, payroll operations, and workforce insights.",
      ar: "PayNest منصة ويب لإدارة الموارد البشرية والرواتب والحضور والإجازات وعمليات القوى العاملة.",
    },
  },
  {
    q: { en: "Which businesses can use it?", ar: "أي الشركات يمكنها استخدامه؟" },
    a: {
      en: "It is designed for small, growing, and multi-branch companies that need a clearer HR and payroll operating system.",
      ar: "مصمم للشركات الصغيرة والنامية ومتعددة الفروع التي تحتاج نظاماً أوضح للموارد البشرية والرواتب.",
    },
  },
  {
    q: { en: "Does PayNest support Arabic?", ar: "هل يدعم PayNest العربية؟" },
    a: {
      en: "Yes. PayNest supports Arabic and English interfaces with RTL and LTR layout support.",
      ar: "نعم. يدعم PayNest العربية والإنجليزية مع اتجاهي RTL و LTR.",
    },
  },
  {
    q: { en: "Can it manage multiple branches?", ar: "هل يدير عدة فروع؟" },
    a: {
      en: "PayNest is built for multi-company and multi-branch structures, with role-based access and company data separation.",
      ar: "PayNest مبني للشركات والفروع المتعددة مع صلاحيات حسب الدور وفصل بيانات الشركات.",
    },
  },
  {
    q: { en: "Does it include employee self-service?", ar: "هل يحتوي على بوابة موظفين؟" },
    a: {
      en: "Yes. Employees can access a dedicated portal for payslips, requests, leave balances, notifications, and tasks.",
      ar: "نعم. يستطيع الموظفون الوصول إلى بوابة خاصة لكشوف الرواتب والطلبات والأرصدة والإشعارات والمهام.",
    },
  },
  {
    q: { en: "Can attendance devices be connected?", ar: "هل يمكن ربط أجهزة الحضور؟" },
    a: {
      en: "PayNest supports attendance import workflows and ZKTeco-ready configuration where the deployment is set up for it.",
      ar: "يدعم PayNest تدفقات استيراد الحضور وتجهيزات ZKTeco عند إعداد البيئة لذلك.",
    },
  },
  {
    q: { en: "Can payroll rules be customized?", ar: "هل يمكن تخصيص قواعد الرواتب؟" },
    a: {
      en: "Payroll rules can be configured around salaries, allowances, deductions, bonuses, overtime, and company-specific workflows.",
      ar: "يمكن ضبط قواعد الرواتب للرواتب والعلاوات والخصومات والمكافآت والإضافي وتدفقات الشركة.",
    },
  },
  {
    q: { en: "Is company data separated?", ar: "هل بيانات الشركات منفصلة؟" },
    a: {
      en: "The system is designed around company-level data separation and role-based access controls.",
      ar: "النظام مصمم حول فصل البيانات على مستوى الشركة والتحكم بالصلاحيات حسب الدور.",
    },
  },
  {
    q: { en: "Is onboarding support available?", ar: "هل يتوفر دعم للتشغيل؟" },
    a: {
      en: "Yes. Companies can request onboarding help for setup, employee imports, payroll configuration, and training.",
      ar: "نعم. يمكن للشركات طلب دعم التشغيل للإعداد واستيراد الموظفين وضبط الرواتب والتدريب.",
    },
  },
  {
    q: { en: "Can companies request custom integrations?", ar: "هل يمكن طلب تكاملات مخصصة؟" },
    a: {
      en: "Yes. Custom integrations can be discussed for attendance, accounting, reporting, and operational workflows.",
      ar: "نعم. يمكن مناقشة تكاملات مخصصة للحضور والمحاسبة والتقارير وسير العمل.",
    },
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/80 px-3 py-1.5 text-xs font-bold text-brand-700 shadow-soft">
      <Sparkles size={14} />
      {children}
    </div>
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-extrabold text-white shadow-btn-primary-hover transition hover:-translate-y-0.5 hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200"
    >
      {children}
      <ArrowRight size={16} className="transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-800 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
    >
      {children}
    </Link>
  );
}

function PublicNavbar({ ar }: { ar: boolean }) {
  const { lang, toggleLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-xl"
          : "border-transparent bg-white/55 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-100" aria-label="PayNest home">
          <BrandLogo variant="row" markClass="h-10" textClass="h-5" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
            >
              {tx(item.label, ar)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => toggleLanguage(lang === "ar" ? "en" : "ar")}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            <Languages size={16} />
            {lang === "ar" ? "EN" : "AR"}
          </button>
          <Link
            href="/portal-select"
            className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            {ar ? "تسجيل الدخول" : "Login"}
          </Link>
          <PrimaryButton href="/contact">{ar ? "احجز عرضاً" : "Book a Demo"}</PrimaryButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-soft transition hover:border-brand-200 hover:text-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100 lg:hidden"
          aria-expanded={open}
          aria-label={ar ? "فتح القائمة" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-4 shadow-card backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {tx(item.label, ar)}
              </Link>
            ))}
            <div className="mt-2 grid gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => toggleLanguage(lang === "ar" ? "en" : "ar")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
              >
                <Languages size={16} />
                {lang === "ar" ? "English" : "العربية"}
              </button>
              <SecondaryButton href="/portal-select">{ar ? "تسجيل الدخول" : "Login"}</SecondaryButton>
              <PrimaryButton href="/contact">{ar ? "احجز عرضاً" : "Book a Demo"}</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MetricPill({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-elevated backdrop-blur">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={18} />
      </div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function HeroSection({ ar }: { ar: boolean }) {
  return (
    <section id="product" className="relative isolate overflow-hidden bg-gradient-to-b from-white via-brand-50/55 to-white pt-16">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(12,140,232,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(12,140,232,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div aria-hidden className="absolute left-1/2 top-0 -z-10 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand-200/35 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="text-center lg:text-start">
            <SectionLabel>{ar ? "منصة موارد بشرية ورواتب ذكية" : "Premium HR and payroll platform"}</SectionLabel>
            <h1 className="text-balance text-5xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              {ar ? "موارد بشرية أذكى. رواتب أسهل. منصة واحدة قوية." : "Smarter HR. Effortless Payroll. One Powerful Platform."}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 lg:mx-0">
              {ar
                ? "أدر الموظفين والحضور والرواتب والإجازات والموافقات ورؤى القوى العاملة من منصة واحدة آمنة وذكية."
                : "Manage employees, attendance, payroll, leave requests, approvals, and workforce insights from one secure and intelligent platform."}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <PrimaryButton href="/contact">{ar ? "احجز عرضاً" : "Book a Demo"}</PrimaryButton>
              <SecondaryButton href="#features">{ar ? "استكشف PayNest" : "Explore PayNest"}</SecondaryButton>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs font-bold text-slate-600 lg:justify-start">
              {trustSignals.slice(0, 3).map((item) => (
                <span key={item.en} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 shadow-soft">
                  <item.icon size={15} className="text-emerald-500" />
                  {ar ? item.ar : item.en}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div aria-hidden className="absolute -inset-8 rounded-[2rem] bg-gradient-to-tr from-brand-200/45 via-white to-cyan-100/50 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/80 bg-white/80 p-3 shadow-elevated backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-2 shadow-card">
                <div className="mb-2 flex items-center gap-2 px-2 py-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ms-3 text-xs font-bold text-slate-400">paynest.app/dashboard</span>
                </div>
                <img
                  src="/analytics-preview.png"
                  alt={ar ? "واجهة PayNest للرواتب والتحليلات" : "PayNest payroll and analytics dashboard"}
                  className="aspect-[16/10] w-full rounded-[1.2rem] object-cover object-top"
                />
              </div>
            </div>
            <div className="absolute -bottom-7 left-2 hidden w-48 sm:block lg:-left-8">
              <MetricPill icon={WalletCards} label={ar ? "تشغيل رواتب" : "Payroll run"} value="Ready" />
            </div>
            <div className="absolute -right-2 top-10 hidden w-48 sm:block lg:-right-8">
              <MetricPill icon={Clock3} label={ar ? "الحضور اليوم" : "Attendance today"} value="96%" />
            </div>
            <div className="absolute bottom-12 right-5 hidden w-48 md:block">
              <MetricPill icon={CalendarDays} label={ar ? "طلبات بانتظار الموافقة" : "Leave approvals"} value="12" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustSection({ ar }: { ar: boolean }) {
  return (
    <section className="border-y border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 text-center text-sm font-extrabold text-slate-500">
          {ar ? "مصمم للفرق الحديثة في منطقة الشرق الأوسط وشمال أفريقيا" : "Built for modern teams across the MENA region."}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {trustSignals.map((signal) => (
            <div key={signal.en} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
                <signal.icon size={18} />
              </div>
              <span className="text-sm font-bold text-slate-700">{ar ? signal.ar : signal.en}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemSolutionSection({ ar }: { ar: boolean }) {
  const before = [
    { en: "Scattered Excel sheets", ar: "ملفات Excel متفرقة" },
    { en: "Manual salary calculations", ar: "حساب رواتب يدوي" },
    { en: "Attendance mistakes", ar: "أخطاء في الحضور" },
    { en: "Slow leave approvals", ar: "موافقات إجازات بطيئة" },
    { en: "Limited management visibility", ar: "رؤية إدارية محدودة" },
  ];
  const after = [
    { en: "One organized operating system", ar: "نظام تشغيلي منظم واحد" },
    { en: "Automated payroll runs", ar: "تشغيل رواتب آلي" },
    { en: "Clear attendance and overtime", ar: "حضور وإضافي واضح" },
    { en: "Structured approval workflows", ar: "سلاسل موافقات منظمة" },
    { en: "Live insights for managers", ar: "رؤى لحظية للمديرين" },
  ];

  return (
    <section id="solutions" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>{ar ? "من الفوضى إلى الوضوح" : "From scattered work to operating clarity"}</SectionLabel>
          <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {ar ? "PayNest يحل مشاكل الموارد البشرية اليومية بدون تعقيد." : "PayNest solves the daily HR and payroll problems that slow teams down."}
          </h2>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <ComparisonCard
            tone="before"
            title={ar ? "قبل PayNest" : "Before PayNest"}
            items={before.map((item) => tx(item, ar))}
          />
          <ComparisonCard
            tone="after"
            title={ar ? "مع PayNest" : "With PayNest"}
            items={after.map((item) => tx(item, ar))}
          />
        </div>
      </div>
    </section>
  );
}

function ComparisonCard({ title, items, tone }: { title: string; items: string[]; tone: "before" | "after" }) {
  const positive = tone === "after";
  return (
    <div className={clsx("rounded-[1.5rem] border p-6 shadow-soft", positive ? "border-brand-200 bg-white" : "border-slate-200 bg-white/70")}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h3 className="text-2xl font-black text-slate-950">{title}</h3>
        <div className={clsx("rounded-full px-3 py-1 text-xs font-black", positive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
          {positive ? "CONTROL" : "MANUAL"}
        </div>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
            <div className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", positive ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-500")}>
              {positive ? <Check size={16} /> : <X size={16} />}
            </div>
            <span className="text-sm font-bold text-slate-700">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniDashboard({ icon: Icon, title, points }: { icon: IconType; title: string; points: string[] }) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-elevated">
      <div aria-hidden className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-brand-100 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon size={22} />
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">PayNest module</div>
          <div className="text-lg font-black text-slate-950">{title}</div>
        </div>
      </div>
      <div className="relative mt-6 grid gap-3">
        {points.map((point, index) => (
          <div key={point} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{point}</span>
              <span className="text-xs font-black text-brand-600">{index + 1}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${70 + index * 8}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureShowcase({ ar }: { ar: boolean }) {
  return (
    <section id="features" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>{ar ? "نظام كامل، بدون حشو" : "Complete product, clean workflows"}</SectionLabel>
          <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {ar ? "كل وحدة مصممة لتقليل العمل اليدوي ورفع وضوح الإدارة." : "Every module is designed to reduce manual work and improve management visibility."}
          </h2>
        </div>
        <div className="mt-14 grid gap-8">
          {productModules.map((module, index) => (
            <div
              key={module.title.en}
              className="grid items-center gap-8 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-brand-50/45 p-5 shadow-soft lg:grid-cols-2 lg:p-8"
            >
              <div className={clsx(index % 2 === 1 && "lg:order-2")}>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-btn-primary-hover">
                  <module.icon size={24} />
                </div>
                <h3 className="text-3xl font-black text-slate-950">{tx(module.title, ar)}</h3>
                <p className="mt-4 text-base leading-8 text-slate-600">{tx(module.body, ar)}</p>
                <div className="mt-6 grid gap-3">
                  {module.points.map((point) => (
                    <div key={point.en} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      {tx(point, ar)}
                    </div>
                  ))}
                </div>
              </div>
              <MiniDashboard
                icon={module.icon}
                title={tx(module.title, ar)}
                points={module.points.map((point) => tx(point, ar))}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PortalExperience({ ar }: { ar: boolean }) {
  const [active, setActive] = useState(portalTabs[0].key);
  const current = portalTabs.find((tab) => tab.key === active) || portalTabs[0];
  const Icon = current.icon;

  return (
    <section className="bg-slate-950 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
            <Layers3 size={14} />
            {ar ? "تجربة لكل دور" : "Dedicated portal experiences"}
          </div>
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
            {ar ? "كل مستخدم يرى الأدوات التي يحتاجها فقط." : "Every role gets the tools it needs, without extra noise."}
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3">
            {portalTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl border p-4 text-start transition focus:outline-none focus:ring-4 focus:ring-brand-400/25",
                  active === tab.key ? "border-brand-400 bg-brand-500/15" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                )}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
                  <tab.icon size={20} />
                </span>
                <span>
                  <span className="block font-black">{tx(tab.title, ar)}</span>
                  <span className="mt-1 block text-sm text-slate-400">{tx(tab.benefit, ar)}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.03] p-6 shadow-elevated">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white">
                  <Icon size={22} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Portal preview</div>
                  <div className="text-2xl font-black">{tx(current.title, ar)}</div>
                </div>
              </div>
              <BadgeCheck className="text-emerald-300" size={24} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {current.tools.map((tool) => (
                <div key={tool.en} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <div className="mb-5 h-2 w-16 rounded-full bg-brand-400" />
                  <div className="text-sm font-black">{tx(tool, ar)}</div>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 rounded-full bg-white/10" />
                    <div className="h-2 w-2/3 rounded-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
              {tx(current.benefit, ar)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection({ ar }: { ar: boolean }) {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>{ar ? "كيف يعمل" : "How PayNest works"}</SectionLabel>
          <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {ar ? "من الإعداد إلى الرواتب خلال مسار واضح." : "From setup to payroll in one clear operating flow."}
          </h2>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-6">
          {workflow.map((step, index) => (
            <div key={step.en} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                {index + 1}
              </div>
              <div className="text-sm font-black leading-6 text-slate-900">{tx(step, ar)}</div>
              {index < workflow.length - 1 && (
                <div className="absolute end-[-18px] top-9 hidden h-px w-8 bg-brand-200 lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection({ ar }: { ar: boolean }) {
  return (
    <section className="bg-brand-50/60 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <SectionLabel>{ar ? "التكاملات" : "Integrations"}</SectionLabel>
            <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              {ar ? "جاهز لبيئة العمل الحقيقية، وواضح بشأن القادم." : "Ready for real operations, clear about what is next."}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              {ar
                ? "نعرض التكاملات بدقة: ما هو متاح، وما هو قيد التطوير، وما هو مخطط له حتى لا توجد وعود غير واقعية."
                : "PayNest separates what is available, what is in development, and what is planned so buyers get a clear, credible view."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {integrations.map((integration) => (
              <div key={integration.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <integration.icon size={20} />
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                    {tx(integration.status, ar)}
                  </span>
                </div>
                <div className="font-black text-slate-950">{integration.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityRegionalSection({ ar }: { ar: boolean }) {
  const security = [
    { icon: LockKeyhole, text: { en: "Secure authentication", ar: "مصادقة آمنة" } },
    { icon: KeyRound, text: { en: "Role-based permissions", ar: "صلاحيات حسب الدور" } },
    { icon: Network, text: { en: "Company data separation", ar: "فصل بيانات الشركات" } },
    { icon: FileText, text: { en: "Audit logs", ar: "سجلات تدقيق" } },
    { icon: Database, text: { en: "Backup-ready architecture", ar: "بنية جاهزة للنسخ الاحتياطي" } },
    { icon: ShieldCheck, text: { en: "Secure API architecture", ar: "بنية API آمنة" } },
  ];
  const regional = [
    { en: "Arabic and English interfaces", ar: "واجهات عربية وإنجليزية" },
    { en: "RTL and LTR support", ar: "دعم RTL و LTR" },
    { en: "Jordan-focused payroll configuration", ar: "إعدادات رواتب مناسبة للأردن" },
    { en: "Saudi-ready configuration where supported", ar: "إعدادات جاهزة للسعودية عند توفرها" },
    { en: "Multi-branch and multi-company management", ar: "إدارة شركات وفروع متعددة" },
    { en: "Configurable holidays, overtime, and allowances", ar: "عطل وإضافي وعلاوات قابلة للتخصيص" },
  ];

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-elevated">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-3xl font-black">{ar ? "مصمم مع الأمان وفصل البيانات في الحسبان." : "Designed with security, access control, and data separation in mind."}</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {security.map((item) => (
              <div key={item.text.en} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <item.icon size={18} className="text-cyan-200" />
                <span className="text-sm font-bold text-slate-200">{tx(item.text, ar)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 shadow-soft">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Globe2 size={26} />
          </div>
          <h2 className="text-3xl font-black text-slate-950">{ar ? "جاهزية مرنة لشركات MENA." : "Flexible readiness for MENA businesses."}</h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {ar
              ? "إعدادات مرنة لمتطلبات الموارد البشرية والرواتب في المنطقة بدون ادعاءات امتثال قانوني غير مثبتة."
              : "Flexible configuration for regional HR and payroll requirements without unsupported compliance claims."}
          </p>
          <div className="mt-7 grid gap-3">
            {regional.map((item) => (
              <div key={item.en} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-3">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="text-sm font-bold text-slate-700">{tx(item, ar)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsSection({ ar }: { ar: boolean }) {
  const metrics = [
    { label: { en: "Total payroll", ar: "إجمالي الرواتب" }, value: "JOD 48.2K", icon: WalletCards },
    { label: { en: "Employees", ar: "الموظفون" }, value: "126", icon: Users2 },
    { label: { en: "Attendance rate", ar: "نسبة الحضور" }, value: "96.4%", icon: Clock3 },
    { label: { en: "Overtime", ar: "الإضافي" }, value: "312h", icon: Zap },
  ];
  return (
    <section className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <SectionLabel>{ar ? "لوحة التحليلات" : "Analytics showcase"}</SectionLabel>
            <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              {ar ? "رؤية مالية وتشغيلية بدون انتظار التقارير اليدوية." : "Financial and workforce visibility without waiting for manual reports."}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              {ar
                ? "مثال تشغيلي يوضح كيف يمكن للمدير متابعة الرواتب وعدد الموظفين والحضور والإضافي واتجاهات الأقسام."
                : "An example operating snapshot showing payroll, headcount, attendance, overtime, leave trends, and department performance."}
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-elevated">
            <div className="grid gap-4 sm:grid-cols-2">
              {metrics.map((metric) => (
                <MetricPill key={metric.label.en} icon={metric.icon} label={tx(metric.label, ar)} value={metric.value} />
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-black text-slate-950">{ar ? "اتجاه تكلفة الرواتب" : "Payroll cost trend"}</div>
                <LineChart size={20} className="text-brand-600" />
              </div>
              <div className="flex h-36 items-end gap-3">
                {[46, 58, 54, 69, 73, 88, 82, 92].map((height, index) => (
                  <div key={index} className="flex-1 rounded-t-xl bg-gradient-to-t from-brand-600 to-cyan-300" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection({ ar }: { ar: boolean }) {
  const [annual, setAnnual] = useState(true);
  const plans = [
    {
      name: { en: "Essential", ar: "Essential" },
      desc: { en: "For small teams starting their HR digital transformation.", ar: "للفرق الصغيرة التي تبدأ التحول الرقمي للموارد البشرية." },
      price: { en: "Starting from", ar: "يبدأ من" },
      features: [
        { en: "Employee records", ar: "سجلات الموظفين" },
        { en: "Basic attendance", ar: "حضور أساسي" },
        { en: "Leave management", ar: "إدارة الإجازات" },
      ],
    },
    {
      name: { en: "Growth", ar: "Growth" },
      desc: { en: "For growing companies needing HR, attendance, and payroll tools.", ar: "للشركات النامية التي تحتاج أدوات الموارد البشرية والحضور والرواتب." },
      price: { en: "Recommended", ar: "الأكثر مناسبة" },
      recommended: true,
      features: [
        { en: "Payroll automation", ar: "أتمتة الرواتب" },
        { en: "HR approvals", ar: "موافقات الموارد البشرية" },
        { en: "Analytics and reports", ar: "تحليلات وتقارير" },
      ],
    },
    {
      name: { en: "Enterprise", ar: "Enterprise" },
      desc: { en: "For custom workflows, integrations, branches, and dedicated support.", ar: "للتدفقات المخصصة والتكاملات والفروع والدعم الخاص." },
      price: { en: "Custom Pricing", ar: "تسعير مخصص" },
      features: [
        { en: "Custom integrations", ar: "تكاملات مخصصة" },
        { en: "Multi-branch workflows", ar: "تدفقات متعددة الفروع" },
        { en: "Dedicated support", ar: "دعم مخصص" },
      ],
    },
  ];
  return (
    <section id="pricing" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>{ar ? "الأسعار" : "Pricing"}</SectionLabel>
          <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {ar ? "خطط مرنة حسب مرحلة شركتك." : "Flexible plans for every stage of your company."}
          </h2>
          <div className="mt-7 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button type="button" onClick={() => setAnnual(false)} className={clsx("rounded-xl px-4 py-2 text-sm font-black", !annual ? "bg-white text-brand-700 shadow-soft" : "text-slate-500")}>
              {ar ? "شهري" : "Monthly"}
            </button>
            <button type="button" onClick={() => setAnnual(true)} className={clsx("rounded-xl px-4 py-2 text-sm font-black", annual ? "bg-white text-brand-700 shadow-soft" : "text-slate-500")}>
              {ar ? "سنوي" : "Annual"}
            </button>
          </div>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name.en} className={clsx("rounded-[2rem] border p-6 shadow-soft", plan.recommended ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white")}>
              {plan.recommended && <div className="mb-4 inline-flex rounded-full bg-brand-600 px-3 py-1 text-xs font-black text-white">{ar ? "موصى به" : "Recommended"}</div>}
              <h3 className="text-2xl font-black text-slate-950">{tx(plan.name, ar)}</h3>
              <p className="mt-3 min-h-14 text-sm leading-6 text-slate-600">{tx(plan.desc, ar)}</p>
              <div className="mt-6 text-2xl font-black text-slate-950">{tx(plan.price, ar)}</div>
              <div className="mt-6 grid gap-3">
                {plan.features.map((feature) => (
                  <div key={feature.en} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={17} className="text-emerald-500" />
                    {tx(feature, ar)}
                  </div>
                ))}
              </div>
              <div className="mt-7">
                <PrimaryButton href="/contact">{ar ? "احجز عرضاً" : plan.recommended ? "Book a Demo" : "Contact Sales"}</PrimaryButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OutcomesSection({ ar }: { ar: boolean }) {
  const outcomes = [
    { icon: Zap, text: { en: "Reduce manual payroll work", ar: "تقليل العمل اليدوي في الرواتب" } },
    { icon: Settings2, text: { en: "Minimize repetitive HR processes", ar: "تقليل العمليات المتكررة" } },
    { icon: PieChart, text: { en: "Improve employee visibility", ar: "تحسين وضوح بيانات الموظفين" } },
    { icon: Database, text: { en: "Centralize company data", ar: "مركزة بيانات الشركة" } },
    { icon: BellRing, text: { en: "Accelerate approval workflows", ar: "تسريع الموافقات" } },
    { icon: BarChart3, text: { en: "Improve management reporting", ar: "تحسين تقارير الإدارة" } },
  ];
  return (
    <section id="resources" className="bg-brand-50/70 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>{ar ? "نتائج الأعمال" : "Business Outcomes"}</SectionLabel>
          <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {ar ? "فوائد عملية بدون وعود مزيفة." : "Practical outcomes without fake claims."}
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outcomes.map((outcome) => (
            <div key={outcome.text.en} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <outcome.icon size={20} />
              </div>
              <div className="font-black text-slate-950">{tx(outcome.text, ar)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ ar }: { ar: boolean }) {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <SectionLabel>{ar ? "الأسئلة الشائعة" : "FAQ"}</SectionLabel>
          <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {ar ? "أسئلة مهمة قبل طلب العرض." : "Questions buyers usually ask first."}
          </h2>
        </div>
        <div className="mt-10 grid gap-3">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.q.en} className="rounded-2xl border border-slate-200 bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start font-black text-slate-950 focus:outline-none focus:ring-4 focus:ring-brand-100"
                  aria-expanded={isOpen}
                >
                  {tx(faq.q, ar)}
                  <ChevronDown size={18} className={clsx("shrink-0 transition", isOpen && "rotate-180")} />
                </button>
                {isOpen && <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{tx(faq.a, ar)}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ ar }: { ar: boolean }) {
  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-brand-200 bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-400 p-8 text-white shadow-elevated sm:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">{ar ? "جاهز لتبسيط الموارد البشرية والرواتب؟" : "Ready to simplify HR and payroll?"}</h2>
            <p className="mt-5 text-base leading-8 text-white/85">
              {ar
                ? "اكتشف كيف يمنح PayNest شركتك طريقة أذكى وأسرع وأكثر تنظيماً لإدارة القوى العاملة."
                : "Discover how PayNest can give your company a smarter, faster, and more organized way to manage its workforce."}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-brand-700 shadow-soft transition hover:-translate-y-0.5">
                {ar ? "احجز عرضك" : "Book Your Demo"}
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center rounded-2xl border border-white/35 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10">
                {ar ? "تواصل مع المبيعات" : "Contact Sales"}
              </Link>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/20 bg-white/15 p-4 backdrop-blur">
            <img src="/analytics-preview.png" alt={ar ? "معاينة PayNest" : "PayNest product preview"} className="rounded-[1.2rem] shadow-elevated" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicFooter({ ar }: { ar: boolean }) {
  const columns = [
    {
      title: { en: "Product", ar: "المنتج" },
      links: [
        { label: { en: "HR Management", ar: "إدارة الموارد البشرية" }, href: "#features" },
        { label: { en: "Payroll", ar: "الرواتب" }, href: "#features" },
        { label: { en: "Attendance", ar: "الحضور" }, href: "#features" },
        { label: { en: "Leave Management", ar: "الإجازات" }, href: "#features" },
        { label: { en: "Employee Portal", ar: "بوابة الموظفين" }, href: "#features" },
        { label: { en: "Analytics", ar: "التحليلات" }, href: "#resources" },
      ],
    },
    {
      title: { en: "Company", ar: "الشركة" },
      links: [
        { label: { en: "About", ar: "من نحن" }, href: "/about" },
        { label: { en: "Contact", ar: "تواصل" }, href: "/contact" },
        { label: { en: "Careers", ar: "الوظائف" }, href: "/contact" },
        { label: { en: "Partners", ar: "الشركاء" }, href: "/contact" },
      ],
    },
    {
      title: { en: "Resources", ar: "الموارد" },
      links: [
        { label: { en: "Help Center", ar: "مركز المساعدة" }, href: "/contact" },
        { label: { en: "Documentation", ar: "التوثيق" }, href: "/contact" },
        { label: { en: "Blog", ar: "المدونة" }, href: "/contact" },
        { label: { en: "FAQs", ar: "الأسئلة" }, href: "#faq" },
      ],
    },
    {
      title: { en: "Legal", ar: "قانوني" },
      links: [
        { label: { en: "Privacy Policy", ar: "سياسة الخصوصية" }, href: "/privacy" },
        { label: { en: "Terms of Service", ar: "شروط الخدمة" }, href: "/terms" },
        { label: { en: "Cookie Policy", ar: "سياسة الكوكيز" }, href: "/privacy" },
      ],
    },
  ];

  return (
    <footer className="border-t border-slate-200 bg-slate-950 py-14 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.9fr]">
          <div>
            <BrandLogo variant="row" markClass="h-10" textClass="h-5" className="[&_*]:brightness-0 [&_*]:invert" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
              {ar
                ? "PayNest منصة موارد بشرية ورواتب وحضور وخدمة ذاتية للشركات الحديثة في المنطقة."
                : "PayNest is an HR, payroll, attendance, and employee self-service platform for modern regional teams."}
            </p>
            <div className="mt-5 space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2"><Mail size={15} /> sales@paynest.app</div>
              <div className="flex items-center gap-2"><Globe2 size={15} /> www.paynest.app</div>
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title.en}>
                <h3 className="font-black">{tx(column.title, ar)}</h3>
                <div className="mt-4 grid gap-3">
                  {column.links.map((link) => (
                    <Link key={`${column.title.en}-${link.label.en}`} href={link.href} className="text-sm font-semibold text-slate-400 transition hover:text-white">
                      {tx(link.label, ar)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-sm text-slate-500 sm:flex-row">
          <span>Copyright © 2026 PayNest. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/portal-select" className="hover:text-white">{ar ? "تسجيل الدخول" : "Login"}</Link>
            <Link href="/contact" className="hover:text-white">{ar ? "احجز عرضاً" : "Book a Demo"}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function PublicHomePage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => {
      if (hadDark) html.classList.add("dark");
    };
  }, []);

  const pageClass = useMemo(
    () => clsx("min-h-screen overflow-x-hidden bg-white text-slate-950 selection:bg-brand-100 selection:text-brand-900", ar && "font-arabic"),
    [ar]
  );

  return (
    <div dir={ar ? "rtl" : "ltr"} className={pageClass}>
      <PublicNavbar ar={ar} />
      <main>
        <HeroSection ar={ar} />
        <TrustSection ar={ar} />
        <ProblemSolutionSection ar={ar} />
        <FeatureShowcase ar={ar} />
        <PortalExperience ar={ar} />
        <WorkflowSection ar={ar} />
        <IntegrationsSection ar={ar} />
        <SecurityRegionalSection ar={ar} />
        <AnalyticsSection ar={ar} />
        <PricingSection ar={ar} />
        <OutcomesSection ar={ar} />
        <FAQSection ar={ar} />
        <FinalCTA ar={ar} />
      </main>
      <PublicFooter ar={ar} />
    </div>
  );
}
