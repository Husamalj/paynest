"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/"); return; }

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
        if (user.role === "hr") {
          router.replace("/hr-portal");
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-elevated">
          <Building2 size={26} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="text-lg font-bold text-slate-900">PayNest</div>
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

  return <Layout settings={settings}>{children}</Layout>;
}
