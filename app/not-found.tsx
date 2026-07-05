"use client";

import { useRouter } from "next/navigation";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-6xl font-black text-slate-900 mb-3">404</h1>
        <h2 className="text-xl font-bold text-slate-700 mb-3">Page not found</h2>
        <p className="text-slate-500 mb-8">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 bg-gradient-to-br from-brand-500 to-brand-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sm transition-all hover:from-brand-600 hover:to-brand-800"
        >
          <Home size={16} />
          Back to Home
        </button>
      </div>
    </div>
  );
}
