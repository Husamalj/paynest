"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function TermsPage() {
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {ar ? "شروط الاستخدام" : "Terms of Service"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {ar ? "آخر تحديث: مايو 2026" : "Last updated: May 2026"}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {ar ? (
            <>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">١. القبول بالشروط</h2>
                <p className="text-slate-600 leading-relaxed">
                  باستخدامك لمنصة PayNest، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يُرجى عدم استخدام المنصة.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٢. وصف الخدمة</h2>
                <p className="text-slate-600 leading-relaxed">
                  PayNest هي منصة سحابية لإدارة الرواتب والموارد البشرية مصممة للشركات في منطقة الشرق الأوسط وشمال أفريقيا.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٣. مسؤوليات المستخدم</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>تقديم معلومات دقيقة وحديثة عند التسجيل.</li>
                  <li>الحفاظ على سرية بيانات تسجيل الدخول.</li>
                  <li>عدم استخدام المنصة لأغراض غير قانونية أو ضارة.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٤. ملكية البيانات</h2>
                <p className="text-slate-600 leading-relaxed">تظل بيانات شركتك وموظفيك ملكاً لك. نحن لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة.</p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٥. إخلاء المسؤولية</h2>
                <p className="text-slate-600 leading-relaxed">تُقدَّم المنصة "كما هي" دون ضمانات. لا تتحمل PayNest مسؤولية أي خسائر ناجمة عن استخدام المنصة.</p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٦. القانون الحاكم</h2>
                <p className="text-slate-600 leading-relaxed">تخضع هذه الشروط للقوانين المعمول بها في المملكة الأردنية الهاشمية.</p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٧. التواصل معنا</h2>
                <p className="text-slate-600 leading-relaxed">للاستفسارات: <strong>Maen.hadayed@gmail.com</strong></p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
                <p className="text-slate-600 leading-relaxed">
                  By using PayNest, you agree to be bound by these Terms of Service. If you do not agree to any part of these terms, please do not use the platform.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">2. Description of Service</h2>
                <p className="text-slate-600 leading-relaxed">
                  PayNest is a cloud-based payroll and HR management platform designed for businesses in the MENA region.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">3. User Responsibilities</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>Provide accurate and current information when registering.</li>
                  <li>Keep your login credentials confidential.</li>
                  <li>Not use the platform for illegal or harmful purposes.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">4. Data Ownership</h2>
                <p className="text-slate-600 leading-relaxed">Your company and employee data remains yours. We do not sell your data or share it with third parties.</p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">5. Disclaimer</h2>
                <p className="text-slate-600 leading-relaxed">The platform is provided "as is" without warranties. PayNest is not liable for any losses resulting from use of the platform.</p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">6. Governing Law</h2>
                <p className="text-slate-600 leading-relaxed">These terms are governed by the laws of the Hashemite Kingdom of Jordan.</p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">7. Contact Us</h2>
                <p className="text-slate-600 leading-relaxed">For any questions: <strong>Maen.hadayed@gmail.com</strong></p>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
