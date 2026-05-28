"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, CheckCircle2, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";

export default function ForceChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("123456");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 6) {
      setError("كلمة السر الجديدة لازم تكون 6 أحرف أو أكثر");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمة السر الجديدة غير متطابقة");
      return;
    }

    try {
      setSaving(true);
      await api.put("/auth/change-password", { currentPassword, newPassword });
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...user, must_change_password: false }));
      const role = localStorage.getItem("role");
      const dest =
        role === "super_admin" ? "/super-admin"
        : role === "owner"     ? "/owner-portal"
        : role === "employee"  ? "/employee-portal"
        : "/dashboard";
      router.replace(dest);
    } catch (err: any) {
      setError(err.message || "فشل تغيير كلمة السر");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="relative min-h-screen flex flex-col bg-slate-50">
      {/* Soft brand radial blob */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(12, 140, 232, 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Slim header */}
      <header className="relative bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-center">
        <span className="font-bold text-slate-900 text-[15px]">
          Pay<span className="text-brand-600">Nest</span>
        </span>
      </header>

      {/* Main */}
      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl shadow-elevated border border-slate-200/70 p-8"
          >
            {/* Icon + title */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <LockKeyhole size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-center text-slate-900 mb-1">
              تغيير كلمة السر
            </h1>
            <p className="text-center text-slate-400 text-xs mb-6">
              لازم تغيّر كلمة السر المؤقتة قبل استخدام النظام
            </p>

            {/* Current password */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              كلمة السر الحالية
            </label>
            <div className="relative mb-4">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 pr-11 text-sm transition-colors"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* New password */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              كلمة السر الجديدة
            </label>
            <div className="relative mb-4">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 pr-11 text-sm transition-colors"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm password */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              تأكيد كلمة السر الجديدة
            </label>
            <div className="relative mb-4">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 pr-11 text-sm transition-colors"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="text-red-600 text-sm mb-4 text-center bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              disabled={saving}
              className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 transition-all shadow-sm text-sm flex items-center justify-center gap-2"
            >
              {saving ? "جاري الحفظ..." : <><CheckCircle2 size={18} /> حفظ كلمة السر</>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
