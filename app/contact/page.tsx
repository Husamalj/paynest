"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ContactPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <Back size={16} />
          {ar ? "العودة" : "Back"}
        </button>
        <button
          onClick={() => router.push("/")}
          className="font-bold text-slate-900 text-[15px] hover:opacity-70 transition-opacity"
        >
          Pay<span className="text-brand-600">Nest</span>
        </button>
        <div className="w-16" />
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Mail size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{ar ? "تواصل معنا" : "Contact Us"}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{ar ? "نحن هنا للمساعدة" : "We're here to help"}</p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed">
            {ar
              ? "هل لديك سؤال أو تحتاج إلى دعم؟ تواصل معنا عبر البريد الإلكتروني وسنرد عليك في أقرب وقت ممكن."
              : "Have a question or need support? Reach out via email and we'll get back to you as soon as possible."}
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <a href="mailto:maen.hadayed@gmail.com" className="flex items-center gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <Mail size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700 group-hover:text-brand-700 transition-colors">
                  {ar ? "البريد الإلكتروني" : "Email"}
                </div>
                <div className="text-sm text-slate-500">maen.hadayed@gmail.com</div>
              </div>
            </a>
            <div className="border-t border-slate-100" />
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700">{ar ? "واتساب" : "WhatsApp"}</div>
                <div className="text-sm text-slate-500">{ar ? "متاح عند الطلب" : "Available on request"}</div>
              </div>
            </div>
          </div>

          <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
            <h3 className="font-semibold text-brand-900 mb-2">{ar ? "ساعات الدعم" : "Support Hours"}</h3>
            <p className="text-sm text-brand-700">
              {ar ? "الأحد – الخميس، ٩ صباحاً – ٦ مساءً (توقيت عمّان)" : "Sun – Thu, 9 AM – 6 PM (Amman time)"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
