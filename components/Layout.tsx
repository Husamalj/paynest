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
  ScrollText,
  FileText,
  Mail,
  Banknote,
  KeyRound,
  X,
  AlertTriangle,
  CheckCircle2,
  UserCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
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
    ],
  },
  { key: "supervisorAssignment", path: "/supervisor-assignment", icon: Network },
  { key: "evaluations", path: "/evaluations", icon: ClipboardList },
  { key: "leaves", path: "/leaves", icon: Palmtree },
  { key: "bonuses", path: "/bonuses", icon: Gift },
  { key: "advances", path: "/advances", icon: Banknote },
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

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={clsx(
          "group fixed top-0 bottom-0 z-40 w-64 lg:w-16 lg:hover:w-64 bg-white border-slate-200 transition-all duration-200 ease-out flex flex-col",
          isRTL
            ? "right-0 border-l " + (sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0")
            : "left-0 border-r " + (sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
        )}
      >
        <div className="px-3 lg:px-2 lg:group-hover:px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3 lg:justify-center lg:group-hover:justify-start">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Building2 size={18} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0 lg:hidden lg:group-hover:block">
              <div className="text-[15px] font-bold text-slate-900 truncate">{companyName}</div>
              <div className="text-[11px] text-slate-500 font-medium">HR & Payroll</div>
            </div>
          </div>
          {/* Collapsed: show company name tiny under the logo so it's always present */}
          <div className="hidden lg:block lg:group-hover:hidden text-center text-[10px] font-semibold text-slate-700 truncate mt-1">{companyName}</div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
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
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all lg:justify-center lg:group-hover:justify-start",
                        isActive ? "bg-brand-50 text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <Icon size={17} className={clsx("flex-shrink-0", isActive ? "text-brand-600" : "text-slate-400")} />
                      <span className="flex-1 text-left lg:hidden lg:group-hover:block">{t(item.key)}</span>
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all lg:justify-center lg:group-hover:justify-start",
                    item.key === "settings" && "mt-2 border-t border-slate-100 pt-3",
                    isActive ? "bg-brand-50 text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className={clsx("flex-shrink-0", isActive ? "text-brand-600" : "text-slate-400")} />
                  <span className="lg:hidden lg:group-hover:block">{t(item.key)}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Pinned bottom: Settings + Contact us */}
        <div className="px-3 py-3 border-t border-slate-100 space-y-0.5">
          {navItems.some((i) => i.key === "settings") && (
            <Link
              href="/settings"
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all lg:justify-center lg:group-hover:justify-start",
                pathname.startsWith("/settings") ? "bg-brand-50 text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <SettingsIcon size={17} className={clsx("flex-shrink-0", pathname.startsWith("/settings") ? "text-brand-600" : "text-slate-400")} />
              <span className="lg:hidden lg:group-hover:block">{t("settings")}</span>
            </Link>
          )}
          <a
            href="mailto:support@paynest.app"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all lg:justify-center lg:group-hover:justify-start"
          >
            <Mail size={17} strokeWidth={2} className="text-slate-400 flex-shrink-0" />
            <span className="lg:hidden lg:group-hover:block">{isRTL ? "تواصل معنا" : "Contact us"}</span>
          </a>
        </div>
      </aside>

      <div className={clsx("min-h-screen flex flex-col transition-all", isRTL ? "lg:mr-16" : "lg:ml-16")}>
        <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <CurrentIcon size={16} strokeWidth={2.5} />
              </div>
              <h1 className="text-[15px] font-semibold text-slate-900 truncate">
                {t((currentNav?.key || "dashboard") as TranslationKey)}
              </h1>
            </div>
          </div>

          {/* Right side: bell + profile, tightly grouped */}
          <div className="flex items-center gap-2">
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
