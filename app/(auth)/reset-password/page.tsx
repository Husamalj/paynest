"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Reset failed. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Invalid reset link.</p>
          <button
            onClick={() => router.push("/forgot-password")}
            className="text-brand-600 hover:underline text-sm"
          >
            Request a new one
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(ellipse at center, #2563eb 0%, transparent 70%)",
          }}
        />
      </div>

      <header className="relative bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between">
        <div />
        <button
          onClick={() => router.push("/")}
          className="font-bold text-slate-900 text-[15px] hover:opacity-70 transition-opacity"
        >
          Pay<span className="text-brand-600">Nest</span>
        </button>
        <div className="w-16" />
      </header>

      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-elevated border border-slate-200/70 p-8 w-full max-w-sm">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={26} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">
                Password reset!
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Your password has been updated. You can now log in.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                  <Lock size={20} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  Set new password
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Must be at least 8 characters.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input w-full pr-10"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="form-input w-full"
                    placeholder="Repeat password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <span className="spinner" />}
                  {loading ? "Updating…" : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
