"use client";

import { useEffect } from "react";
import { logError } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("app.render_error", error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-3">Something went wrong</h2>
        <p className="text-slate-500 mb-8">An unexpected error occurred. You can try again or return to the home page.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-slate-300 font-semibold px-5 py-2.5 rounded-xl transition-all"
          >
            <RefreshCw size={15} />
            Try Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-brand-500 to-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all hover:from-brand-600 hover:to-brand-800"
          >
            <Home size={15} />
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
