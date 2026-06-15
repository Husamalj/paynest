"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import Layout from "@/components/Layout";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

// Localize a stored (English) notification message into Arabic when needed.
function localizeNotification(msg: string, lang: string): string {
  if (lang !== "ar" || !msg) return msg;
  const leaveTypeAr: Record<string, string> = {
    sick: "مرضية", annual: "سنوية", unpaid: "بدون راتب", permission: "مغادرة", leave: "إجازة",
  };
  let m: RegExpMatchArray | null;

  if (msg === "Company registered. Awaiting administrator approval.")
    return "تم تسجيل الشركة. بانتظار موافقة المدير.";

  m = msg.match(/^Leave request for (.+) has been (approved|rejected|pending)\.$/);
  if (m) {
    const name = m[1];
    if (m[2] === "approved") return `تمت الموافقة على طلب إجازة ${name}.`;
    if (m[2] === "rejected") return `تم رفض طلب إجازة ${name}.`;
    return `طلب إجازة ${name} قيد الانتظار.`;
  }

  m = msg.match(/^(.+) submitted a (\w+) request\.$/);
  if (m) {
    const name = m[1] === "An employee" ? "أحد الموظفين" : m[1];
    return `${name} قدّم طلب ${leaveTypeAr[m[2]] || m[2]}.`;
  }

  m = msg.match(/^Payroll run for (\d+)\/(\d+) has been completed\.$/);
  if (m) return `تم احتساب رواتب ${m[1]}/${m[2]}.`;

  m = msg.match(/^(.+) requested a salary advance of ([\d.]+)\.$/);
  if (m) { const name = m[1] === "An employee" ? "أحد الموظفين" : m[1]; return `${name} طلب سلفة بقيمة ${m[2]}.`; }
  if (msg === "Your salary advance request has been approved.") return "تمت الموافقة على طلب السلفة.";
  if (msg === "Your salary advance request has been rejected.") return "تم رفض طلب السلفة.";

  return msg;
}

function NotificationBell() {
  const { lang } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.get("/notifications?limit=20");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  };

  React.useEffect(() => { load(); }, []);

  React.useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setUnreadCount(0);
      setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    } catch {}
  };

  const markRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-elevated border border-slate-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-900">{lang === "ar" ? "الإشعارات" : "Notifications"}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-800 font-medium">{lang === "ar" ? "تعليم الكل كمقروء" : "Mark all read"}</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">{lang === "ar" ? "لا إشعارات بعد" : "No notifications yet"}</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? "bg-brand-50/40" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />}
                    <div className={!n.read ? "" : "pl-4"}>
                      <p className="text-sm text-slate-800 leading-snug">{localizeNotification(n.message, lang)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    // Credential is an httpOnly cookie; gate on the flag and let /auth/me verify.
    const loggedIn = localStorage.getItem("paynest_logged_in");
    if (!loggedIn) { router.replace("/"); return; }

    const init = async () => {
      try {
        const meRes = await api.get("/auth/me");
        const user = meRes.data.user;
        localStorage.setItem("role", user.role);
        localStorage.setItem("user", JSON.stringify(user));

        if (user.must_change_password) {
          window.location.href = "/force-change-password";
          return;
        }

        if (user.role === "super_admin") {
          router.replace("/super-admin");
          return;
        }
        if (user.role === "employee") {
          router.replace("/employee-portal");
          return;
        }
        if (user.role === "owner") {
          router.replace("/owner-portal");
          return;
        }

        const settingsRes = await api.get("/settings");
        const s = settingsRes.data;
        setSettings(s);

        if (!localStorage.getItem("paynest_lang")) {
          localStorage.setItem("paynest_lang", s?.language || "ar");
        }

        if (user.role === "owner" && !s?.system_mode) {
          router.replace("/system-select");
          return;
        }
      } catch (err: any) {
        if (err.message?.includes("expired") || err.message?.includes("401")) {
          localStorage.clear();
          router.replace("/");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (role !== "owner") return;
    api.get("/companies/onboarding-status")
      .then((res: any) => {
        if (res.data?.needsOnboarding) router.replace("/onboarding");
      })
      .catch(() => {});
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <BrandLogo variant="stacked" markClass="h-16" textClass="h-7" showHr />
        <span className="spinner spinner-dark w-5 h-5" />
        <p className="text-sm text-slate-500">{t("loadingData")}</p>
        {error && (
          <div className="alert alert-error max-w-md text-center">
            <AlertTriangle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return <Layout settings={settings} NotificationBell={NotificationBell}>{children}</Layout>;
}
