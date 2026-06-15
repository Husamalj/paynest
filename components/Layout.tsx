"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload as UploadIcon,
  Wallet,
  Gift,
  Palmtree,
  BarChart3,
  Bell,
  Users,
  Settings as SettingsIcon,
  Languages,
  Menu,
  Building2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  LogOut,
  ShieldCheck,
  Network,
  GitBranch,
  ScrollText,
  FileText,
  Mail,
  Banknote,
  Inbox,
  KeyRound,
  X,
  AlertTriangle,
  CheckCircle2,
  UserCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import clsx from "clsx";
import api from "@/lib/api";
import { TranslationKey } from "@/lib/i18n/translations";

interface NavChild {
  key: TranslationKey;
  path: string;
}

interface NavItem {
  key: TranslationKey;
  path: string;
  icon: React.ElementType;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", path: "/dashboard", icon: LayoutDashboard },
  { key: "upload", path: "/upload", icon: UploadIcon },
  { key: "payroll", path: "/payroll", icon: Wallet },
  {
    key: "employees",
    path: "/employees",
    icon: Users,
    children: [
      { key: "employeeManagement", path: "/employees" },
      { key: "remoteMenu", path: "/employees/remote" },
      { key: "companyStructure", path: "/company-structure" },
    ],
  },
  { key: "supervisorAssignment", path: "/supervisor-assignment", icon: Network },
  { key: "evaluations", path: "/evaluations", icon: ClipboardList },
  {
    key: "requests",
    path: "/leaves",
    icon: Inbox,
    children: [
      { key: "leaves", path: "/leaves" },
      { key: "advances", path: "/advances" },
    ],
  },
  { key: "bonuses", path: "/bonuses", icon: Gift },
  { key: "tasks", path: "/tasks", icon: CheckSquare },
  { key: "jobOffer", path: "/job-offer", icon: FileText },
  { key: "announcements", path: "/announcements", icon: Bell },
  { key: "reports", path: "/reports", icon: BarChart3 },
  { key: "auditLog", path: "/audit-log", icon: ScrollText },
  { key: "hrTeam", path: "/hr-team", icon: ShieldCheck },
  { key: "settings", path: "/settings", icon: SettingsIcon },
];

interface LayoutProps {
  children: React.ReactNode;
  settings?: { company_name?: string } | null;
  NotificationBell?: React.ComponentType<any>;
}

export default function Layout({ children, settings, NotificationBell }: LayoutProps) {
  const { t, lang, toggleLanguage, isRTL } = useLanguage();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({ employees: true });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const role = typeof window !== "undefined" ? localStorage.getItem("role") || "guest" : "guest";
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const signOut = () => {
    // Clear the httpOnly cookie on the server, then the local UI flags.
    try { fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("paynest_logged_in");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("paynest_employee_id");
    window.location.href = "/";
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(lang === "ar" ? "كلمة السر الجديدة غير متطابقة" : "New passwords do not match");
      return;
    }
    try {
      setPasswordLoading(true);
      await api.put("/auth/change-password", { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordSuccess(lang === "ar" ? "تم تغيير كلمة السر بنجاح" : "Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setShowPasswordModal(false), 800);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Owner sees everything. HR sees everything except owner-only items.
  // hrTeam stays owner-only; settings visible to owner + HR.
  const navItems = role === "owner"
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.key !== "hrTeam");
  const companyName = settings?.company_name || user.company_name || "PayNest";

  const currentNav = navItems.find((i) =>
    i.path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(i.path)
  );
  const CurrentIcon = (currentNav?.icon || LayoutDashboard) as React.ElementType;

  // Short descriptor shown under each page title in the top header (like the dashboard).
  const PAGE_SUBTITLES: Record<string, { en: string; ar: string }> = {
    "/dashboard": { en: "HR, payroll, attendance, and employee requests", ar: "الموارد البشرية والرواتب والحضور وطلبات الموظفين" },
    "/employees": { en: "Add, edit, and manage employee records", ar: "إضافة وتعديل وإدارة بيانات الموظفين" },
    "/company-structure": { en: "Read-only org chart", ar: "الهيكل الإداري للشركة" },
    "/payroll": { en: "Calculate and review monthly salaries", ar: "احتساب ومراجعة الرواتب الشهرية" },
    "/leaves": { en: "Leaves, departures, and holidays", ar: "الإجازات والمغادرات والعطل الرسمية" },
    "/advances": { en: "Advance requests — auto-deducted from salary", ar: "طلبات السلف — تُخصم من الراتب تلقائياً" },
    "/upload": { en: "Upload attendance and salary files first", ar: "ارفع ملفات الحضور والرواتب أولاً" },
    "/reports": { en: "Export payroll and attendance reports", ar: "تصدير تقارير الرواتب والحضور" },
    "/bonuses": { en: "Bonuses and deductions", ar: "المكافآت والخصومات" },
    "/tasks": { en: "Assign and track team tasks", ar: "إسناد ومتابعة مهام الفريق" },
    "/announcements": { en: "Company-wide announcements", ar: "إعلانات الشركة" },
    "/hr-team": { en: "Manage HR users", ar: "إدارة مستخدمي الموارد البشرية" },
    "/supervisor-assignment": { en: "Build the org tree", ar: "بناء شجرة الإشراف" },
    "/settings": { en: "System and company settings", ar: "إعدادات النظام والشركة" },
    "/employees/remote": { en: "Manage remote and online work", ar: "إدارة العمل عن بُعد" },
  };
  const subKey = Object.keys(PAGE_SUBTITLES)
    .sort((a, b) => b.length - a.length)
    .find((k) => (k === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(k)));
  const pageSub = subKey ? PAGE_SUBTITLES[subKey] : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={clsx(
          "group fixed top-0 bottom-0 z-40 w-64 lg:w-[68px] lg:hover:w-64 lg:hover:shadow-2xl bg-white border-slate-200 transition-all duration-300 ease-out flex flex-col",
          isRTL
            ? "right-0 border-l " + (sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0")
            : "left-0 border-r " + (sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
        )}
      >
        <div className="h-[72px] flex items-center px-3 lg:justify-center lg:group-hover:justify-start lg:group-hover:px-5 border-b border-slate-100">
          <div className="flex items-center gap-3 w-full">
            <img src="/paynest-mark.png" alt="PayNest" className="h-9 w-auto object-contain flex-shrink-0 dark:brightness-0 dark:invert" />
            <div className="flex-1 min-w-0 lg:hidden lg:group-hover:block">
              <img src="/paynest-wordmark.png" alt="PayNest — HR & Payroll" className="h-9 w-auto object-contain dark:brightness-0 dark:invert" />
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-x-hidden overflow-y-auto">
          <div className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider px-3 mb-2 lg:hidden lg:group-hover:block">{t("overview")}</div>
          <div className="space-y-0.5">
            {navItems.filter((i) => i.key !== "settings").map((item) => {
              const Icon = item.icon as React.ElementType;
              if (item.children) {
                const isActive = pathname.startsWith(item.path);
                const isExpanded = !!expandedKeys[item.key];
                return (
                  <div key={item.key} className="px-1">
                    <button
                      onClick={() => setExpandedKeys((s) => ({ ...s, [item.key]: !s[item.key] }))}
                      className={clsx(
                        "w-full h-10 flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-all lg:justify-center lg:group-hover:justify-start",
                        isActive ? "bg-brand-50 text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <Icon size={17} className={clsx("flex-shrink-0", isActive ? "text-brand-600" : "text-slate-400")} />
                      <span className="flex-1 text-left whitespace-nowrap lg:hidden lg:group-hover:block">{t(item.key)}</span>
                      <ChevronDown size={14} className={clsx("text-slate-400 transition-transform lg:hidden lg:group-hover:block", isExpanded && "rotate-180")} />
                    </button>
                    {isExpanded && (
                      <div className="mt-1 pl-8 space-y-1 lg:hidden lg:group-hover:block">
                        {item.children!.map((ch) => {
                          const isChActive = pathname === ch.path || (ch.path !== "/employees" && pathname.startsWith(ch.path));
                          return (
                            <Link
                              key={ch.key}
                              href={ch.path}
                              onClick={() => setSidebarOpen(false)}
                              className={clsx(
                                "block px-3 py-2 rounded-lg text-sm transition-all",
                                isChActive ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              {t(ch.key)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = item.path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.path);
              return (
                <Link
                  key={item.key}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    "h-10 flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-all lg:justify-center lg:group-hover:justify-start",
                    isActive ? "bg-brand-50 text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className={clsx("flex-shrink-0", isActive ? "text-brand-600" : "text-slate-400")} />
                  <span className="whitespace-nowrap lg:hidden lg:group-hover:block">{t(item.key)}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Pinned bottom: Settings + Contact us */}
        <div className="px-3 py-3 border-t border-slate-100 space-y-0.5 overflow-x-hidden">
          {navItems.some((i) => i.key === "settings") && (
            <Link
              href="/settings"
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                "h-10 flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-all lg:justify-center lg:group-hover:justify-start",
                pathname.startsWith("/settings") ? "bg-brand-50 text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <SettingsIcon size={17} className={clsx("flex-shrink-0", pathname.startsWith("/settings") ? "text-brand-600" : "text-slate-400")} />
              <span className="whitespace-nowrap lg:hidden lg:group-hover:block">{t("settings")}</span>
            </Link>
          )}
          <a
            href="mailto:support@paynest.app"
            className="h-10 flex items-center gap-3 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all lg:justify-center lg:group-hover:justify-start"
          >
            <Mail size={17} strokeWidth={2} className="text-slate-400 flex-shrink-0" />
            <span className="whitespace-nowrap lg:hidden lg:group-hover:block">{isRTL ? "تواصل معنا" : "Contact us"}</span>
          </a>
        </div>
      </aside>

      <div className={clsx("min-h-screen flex flex-col transition-all", isRTL ? "lg:mr-[68px]" : "lg:ml-[68px]")}>
        <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                <CurrentIcon size={16} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] font-semibold text-slate-900 truncate leading-tight">
                  {t((currentNav?.key || "dashboard") as TranslationKey)}
                </h1>
                {pageSub && (
                  <p className="text-[10px] text-slate-400 truncate leading-tight">
                    {pathname === "/dashboard" && <span className="font-semibold text-slate-500">{companyName}</span>}
                    {pathname === "/dashboard" ? " • " : ""}
                    {isRTL ? pageSub.ar : pageSub.en}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right side: company + bell + profile, tightly grouped */}
          <div className="flex items-center gap-2">
          {/* Company name — always visible next to the user */}
          <div className="hidden md:flex items-center gap-1.5 me-1 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 text-sm font-semibold">
            <Building2 size={14} className="text-brand-600" />
            <span className="truncate max-w-[160px]">{companyName}</span>
          </div>
          <ThemeToggle />
          {/* Notification Bell */}
          {NotificationBell && <NotificationBell />}

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {user.photo_url || user.photoUrl ? (
                <img src={user.photo_url || user.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-brand-100" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {(user.name || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{user.name || "User"}</div>
                <div className="text-[11px] text-slate-400 uppercase font-medium">{role}</div>
              </div>
              <ChevronDown size={14} className={clsx("text-slate-400 transition-transform flex-shrink-0", profileOpen && "rotate-180")} />
            </button>

            {profileOpen && (
              <div className={clsx("absolute top-full mt-2 w-64 bg-white rounded-xl shadow-elevated border border-slate-200 overflow-hidden z-50", isRTL ? "left-0" : "right-0")}>
                {/* User info */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="font-semibold text-slate-900 truncate">{user.name || "User"}</div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{user.email || "-"}</div>
                  <div className="mt-1.5 inline-flex px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold uppercase">{role}</div>
                </div>
                {/* Actions */}
                <div className="p-2 space-y-0.5">
                  <button
                    onClick={() => { toggleLanguage(); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Languages size={16} className="text-slate-400" />
                    <span>{lang === "en" ? "العربية" : "English"}</span>
                    <span className="ml-auto text-[11px] font-bold text-slate-400 uppercase">{lang === "en" ? "AR" : "EN"}</span>
                  </button>
                  <button
                    onClick={() => { setShowPasswordModal(true); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <KeyRound size={16} className="text-slate-400" />
                    {lang === "ar" ? "تغيير كلمة السر" : "Change Password"}
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={16} />
                    {lang === "ar" ? "تسجيل خروج" : "Sign Out"}
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <div className="max-w-[1400px] mx-auto animate-fade-in" key={lang}>
            {children}
          </div>
        </main>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{lang === "ar" ? "تغيير كلمة السر" : "Change Password"}</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}><X size={18} /></button>
            </div>
            {passwordError && (
              <div className="alert alert-error mb-3"><AlertTriangle size={16} />{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="alert alert-success mb-3"><CheckCircle2 size={16} />{passwordSuccess}</div>
            )}
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="form-label">{lang === "ar" ? "كلمة السر الحالية" : "Current Password"}</label>
                <input type="password" className="form-input" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">{lang === "ar" ? "كلمة السر الجديدة" : "New Password"}</label>
                <input type="password" className="form-input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">{lang === "ar" ? "تأكيد كلمة السر الجديدة" : "Confirm New Password"}</label>
                <input type="password" className="form-input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                  {passwordLoading ? <span className="spinner" /> : <KeyRound size={16} />}
                  {lang === "ar" ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
