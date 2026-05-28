"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function PrivacyPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-50">
      {/* Header */}
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

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {ar ? "سياسة الخصوصية" : "Privacy Policy"}
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
                <h2 className="text-lg font-bold text-slate-900 mb-3">١. مقدمة</h2>
                <p className="text-slate-600 leading-relaxed">
                  تلتزم PayNest بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيفية جمع معلوماتك واستخدامها والكشف عنها وحمايتها عند استخدام منصتنا لإدارة الرواتب والموارد البشرية.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٢. المعلومات التي نجمعها</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li><strong>معلومات الحساب:</strong> الاسم، البريد الإلكتروني، وكلمة السر المشفرة.</li>
                  <li><strong>بيانات الشركة:</strong> اسم الشركة، معلومات الموظفين، بيانات الرواتب والحضور.</li>
                  <li><strong>بيانات الاستخدام:</strong> سجلات تسجيل الدخول، النشاط على المنصة، والمتصفح المستخدم.</li>
                  <li><strong>بيانات تقنية:</strong> عنوان IP، نوع الجهاز، ونظام التشغيل.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٣. كيف نستخدم معلوماتك</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>تقديم خدمات إدارة الرواتب والموارد البشرية وتحسينها.</li>
                  <li>معالجة عمليات كشف الرواتب والتقارير المالية.</li>
                  <li>التواصل معك بشأن حسابك أو التحديثات.</li>
                  <li>ضمان أمان المنصة والامتثال للمتطلبات القانونية.</li>
                  <li>تقديم الدعم الفني.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٤. مشاركة المعلومات</h2>
                <p className="text-slate-600 leading-relaxed mb-3">لا نبيع بياناتك الشخصية لأطراف ثالثة. قد نشارك بياناتك فقط في الحالات التالية:</p>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>مع مزودي الخدمة الذين يساعدوننا في تشغيل المنصة.</li>
                  <li>عند الطلب من جهات قانونية أو حكومية وفقاً للقوانين المعمول بها.</li>
                  <li>لحماية حقوقنا أو حقوق مستخدمينا في حالة وجود نزاع.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٥. أمان البيانات</h2>
                <p className="text-slate-600 leading-relaxed">
                  نستخدم تشفير HTTPS لجميع الاتصالات، وتشفير كلمات السر باستخدام bcrypt، ونظام تحكم في الوصول قائم على الأدوار.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٦. الاحتفاظ بالبيانات</h2>
                <p className="text-slate-600 leading-relaxed">
                  نحتفظ ببياناتك طالما كان حسابك نشطاً. عند طلب الحذف، نزيل بياناتك في غضون 30 يوماً.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٧. حقوقك</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>الوصول إلى بياناتك الشخصية وتصحيحها.</li>
                  <li>طلب حذف بياناتك.</li>
                  <li>الاعتراض على معالجة بياناتك في حالات معينة.</li>
                  <li>الحصول على نسخة من بياناتك بصيغة منقولة.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٨. ملفات تعريف الارتباط</h2>
                <p className="text-slate-600 leading-relaxed">
                  تستخدم منصتنا ملفات تعريف الارتباط الضرورية فقط للحفاظ على جلسة تسجيل الدخول وتفضيلات اللغة.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٩. التغييرات على هذه السياسة</h2>
                <p className="text-slate-600 leading-relaxed">
                  قد نحدث هذه السياسة من وقت لآخر. سيتم إخطارك بالتغييرات الجوهرية عبر البريد الإلكتروني.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">١٠. التواصل معنا</h2>
                <p className="text-slate-600 leading-relaxed">
                  للاستفسارات: <strong>Maen.hadayed@gmail.com</strong>
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">1. Introduction</h2>
                <p className="text-slate-600 leading-relaxed">
                  PayNest is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our payroll and HR management platform.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">2. Information We Collect</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li><strong>Account Information:</strong> Name, email address, and encrypted password.</li>
                  <li><strong>Company Data:</strong> Company name, employee records, payroll data, and attendance records.</li>
                  <li><strong>Usage Data:</strong> Login logs, platform activity, and browser information.</li>
                  <li><strong>Technical Data:</strong> IP address, device type, and operating system.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>To provide and improve payroll and HR management services.</li>
                  <li>To process payroll runs and financial reports.</li>
                  <li>To communicate with you about your account or updates.</li>
                  <li>To ensure platform security and comply with legal requirements.</li>
                  <li>To provide technical support.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">4. Information Sharing</h2>
                <p className="text-slate-600 leading-relaxed mb-3">We do not sell your personal data to third parties. We may share your data only in these circumstances:</p>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>With service providers who help us operate the platform.</li>
                  <li>When required by legal or governmental authorities under applicable laws.</li>
                  <li>To protect our rights or those of our users in a dispute.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">5. Data Security</h2>
                <p className="text-slate-600 leading-relaxed">
                  We use HTTPS encryption for all communications, bcrypt password hashing, and a role-based access control system.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">6. Data Retention</h2>
                <p className="text-slate-600 leading-relaxed">
                  We retain your data for as long as your account is active. Upon a deletion request, we remove your data within 30 days.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">7. Your Rights</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>Access and correct your personal data.</li>
                  <li>Request deletion of your data.</li>
                  <li>Object to data processing in certain cases.</li>
                  <li>Receive a portable copy of your data.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">8. Cookies</h2>
                <p className="text-slate-600 leading-relaxed">
                  Our platform uses only essential cookies to maintain your login session and language preferences.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">9. Changes to This Policy</h2>
                <p className="text-slate-600 leading-relaxed">
                  We may update this policy from time to time. You will be notified of material changes via email.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">10. Contact Us</h2>
                <p className="text-slate-600 leading-relaxed">
                  For any questions: <strong>Maen.hadayed@gmail.com</strong>
                </p>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
