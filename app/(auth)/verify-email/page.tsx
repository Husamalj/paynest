"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No verification token found.");
      return;
    }
    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus("success"))
      .catch((err: any) => {
        setStatus("error");
        setErrorMsg(
          err.response?.data?.error || "Invalid or expired verification link."
        );
      });
  }, [token]);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50">
      <header className="relative bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-center">
        <button
          onClick={() => router.push("/")}
          className="font-bold text-slate-900 text-[15px] hover:opacity-70 transition-opacity"
        >
          Pay<span className="text-brand-600">Nest</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-elevated border border-slate-200/70 p-8 w-full max-w-sm text-center">
          {status === "loading" && (
            <>
              <Loader2 size={32} className="animate-spin text-brand-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900">
                Verifying your email…
              </h2>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={26} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">
                Email verified!
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Your email has been verified. You can now log in to PayNest.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
              >
                Go to Login
              </button>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <XCircle size={26} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">
                Verification failed
              </h2>
              <p className="text-sm text-slate-500 mb-6">{errorMsg}</p>
              <button
                onClick={() => router.push("/")}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
              >
                Back to Home
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
