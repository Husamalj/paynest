"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

export default function ForceChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("123456");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      router.replace(role === "super_admin" ? "/super-admin" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "فشل تغيير كلمة السر");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4">
          <LockKeyhole size={25} />
        </div>
        <h1 className="text-2xl font-black text-center text-slate-900 mb-2">تغيير كلمة السر</h1>
        <p className="text-center text-slate-500 text-sm mb-6">لازم تغيّر كلمة السر المؤقتة قبل استخدام النظام</p>

        <input
          type="password"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200"
          placeholder="كلمة السر الحالية"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200"
          placeholder="كلمة السر الجديدة"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200"
          placeholder="تأكيد كلمة السر الجديدة"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <div className="text-red-600 text-sm text-center mb-4">{error}</div>}

        <button
          disabled={saving}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? "جاري الحفظ..." : <><CheckCircle2 size={18} /> حفظ كلمة السر</>}
        </button>
      </form>
    </div>
  );
}
