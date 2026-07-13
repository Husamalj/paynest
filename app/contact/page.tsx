"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import BrandLogo from "@/components/BrandLogo";

export default function ContactPage() {
  const router = useRouter();
  const { lang, toggleLanguage } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;
  const empty = { firstName: "", lastName: "", email: "", company: "", teamSize: "1-50", message: "", website: "" };
  const [form, setForm] = useState({ ...empty });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setErr("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      setStatus("sent");
      setForm({ ...empty });
    } catch (error: any) {
      setStatus("error");
      setErr(error.message || (ar ? "صار خطأ" : "Something went wrong"));
    }
  };

  const label = "block text-sm font-semibold text-slate-700 mb-1.5";
  const field = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition";

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-brand-50/60 text-slate-900">
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-brand-100/70">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Back size={16} />
            {ar ? "العودة" : "Back"}
          </button>
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <BrandLogo variant="row" markClass="h-9" textClass="h-5" />
          </button>
          <button
            onClick={() => toggleLanguage()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Globe size={14} />
            {lang === "ar" ? "EN" : "AR"}
          </button>
        </div>
      </header>

      <main className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <div className="text-sm font-bold text-brand-600 mb-3">{ar ? "تواصل معنا" : "Get in touch"}</div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-5">
              {ar ? "تحدّث مع فريقنا" : "Talk to our team"}
            </h1>
            <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-10 max-w-md">
              {ar
                ? "شوف PayNest على أرض الواقع. احكيلنا عن فريقك، وبيتواصل معك مختص يعرضلك عرضًا مخصصًا خلال 24 ساعة."
                : "See PayNest in action. Tell us about your team, and a specialist will walk you through a tailored demo within 24 hours."}
            </p>
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "المبيعات" : "Sales"}</div>
                <a href="mailto:sales@paynest.app" className="font-semibold text-slate-900 hover:text-brand-600" dir="ltr">sales@paynest.app</a>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "الدعم" : "Support"}</div>
                <a href="mailto:support@paynest.app" className="font-semibold text-slate-900 hover:text-brand-600" dir="ltr">support@paynest.app</a>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{ar ? "المقر" : "Headquarters"}</div>
                <div className="font-semibold text-slate-900">{ar ? "عمّان، الأردن · نخدم منطقة الشرق الأوسط" : "Amman, Jordan · Serving the MENA region"}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-elevated border border-slate-100 p-6 sm:p-8">
            {status === "sent" ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <CheckCircle2 size={28} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{ar ? "وصلنا طلبك!" : "Request received!"}</h2>
                <p className="text-sm text-slate-500">{ar ? "بنتواصل معك خلال 24 ساعة." : "We'll be in touch within 24 hours."}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <input type="text" name="website" value={form.website} onChange={set("website")} className="hidden" tabIndex={-1} autoComplete="off" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={label}>{ar ? "الاسم الأول" : "First name"}</label><input className={field} value={form.firstName} onChange={set("firstName")} required /></div>
                  <div><label className={label}>{ar ? "اسم العائلة" : "Last name"}</label><input className={field} value={form.lastName} onChange={set("lastName")} /></div>
                </div>
                <div><label className={label}>{ar ? "البريد الإلكتروني للعمل" : "Work email"}</label><input type="email" dir="ltr" className={field} value={form.email} onChange={set("email")} required /></div>
                <div><label className={label}>{ar ? "الشركة" : "Company"}</label><input className={field} value={form.company} onChange={set("company")} /></div>
                <div>
                  <label className={label}>{ar ? "حجم الفريق" : "Team size"}</label>
                  <select className={field} value={form.teamSize} onChange={set("teamSize")}>
                    {["1-50", "51-150", "151-500", "500+"].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div><label className={label}>{ar ? "كيف نقدر نساعدك؟" : "How can we help?"}</label><textarea rows={4} className={field} value={form.message} onChange={set("message")} /></div>
                {status === "error" && <div className="text-sm text-rose-600">{err}</div>}
                <button type="submit" disabled={status === "sending"} className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl shadow-elevated transition-all">
                  {status === "sending" ? (ar ? "جاري الإرسال..." : "Sending...") : (ar ? "اطلب عرضًا توضيحيًا" : "Request a demo")}
                  {status !== "sending" && <ArrowRight size={17} className={ar ? "rotate-180" : ""} />}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
