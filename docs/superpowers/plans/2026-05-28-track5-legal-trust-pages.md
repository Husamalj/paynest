# Track 5: Legal & Trust Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Terms of Service, Contact, and About pages, link them from the home footer, and add a ToS consent line to the signup form.

**Architecture:** Three new static pages following the exact same layout pattern as the existing `app/privacy/page.tsx` — sticky header with back button, bilingual EN/AR content, white background. No new API routes needed.

**Tech Stack:** Next.js 14, TypeScript, existing `useLanguage` hook for bilingual support

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/terms/page.tsx` | Create | Terms of Service, bilingual |
| `app/contact/page.tsx` | Create | Contact page, bilingual |
| `app/about/page.tsx` | Create | About page, bilingual |
| `app/(auth)/signup/page.tsx` | Modify | Add ToS consent line below submit button |
| `app/page.tsx` | Modify | Add Terms, Contact, About links to footer |

---

## Task 1: Terms of Service Page

**Files:**
- Create: `app/terms/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
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
                  PayNest هي منصة سحابية لإدارة الرواتب والموارد البشرية مصممة للشركات في منطقة الشرق الأوسط وشمال أفريقيا. تتيح المنصة إدارة الموظفين، والرواتب، والحضور، والإجازات، والتقارير.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٣. مسؤوليات المستخدم</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>تقديم معلومات دقيقة وحديثة عند التسجيل.</li>
                  <li>الحفاظ على سرية بيانات تسجيل الدخول.</li>
                  <li>عدم استخدام المنصة لأغراض غير قانونية أو ضارة.</li>
                  <li>إخطارنا فوراً في حال اشتباهك بأي استخدام غير مصرح به لحسابك.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٤. ملكية البيانات</h2>
                <p className="text-slate-600 leading-relaxed">
                  تظل بيانات شركتك وموظفيك ملكاً لك. نحن لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة إلا وفقاً لسياسة الخصوصية الخاصة بنا.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٥. إخلاء المسؤولية</h2>
                <p className="text-slate-600 leading-relaxed">
                  تُقدَّم المنصة "كما هي" دون ضمانات صريحة أو ضمنية. لا تتحمل PayNest مسؤولية أي خسائر مالية أو بيانات ناجمة عن استخدام المنصة.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٦. إنهاء الخدمة</h2>
                <p className="text-slate-600 leading-relaxed">
                  يحق لنا إنهاء أو تعليق حسابك في حال انتهاك هذه الشروط. يمكنك إلغاء اشتراكك في أي وقت عبر إعدادات الحساب.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٧. القانون الحاكم</h2>
                <p className="text-slate-600 leading-relaxed">
                  تخضع هذه الشروط للقوانين المعمول بها في المملكة الأردنية الهاشمية، وتختص المحاكم الأردنية بالنظر في أي نزاعات تنشأ عنها.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٨. تعديل الشروط</h2>
                <p className="text-slate-600 leading-relaxed">
                  نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إخطارك بالتغييرات الجوهرية عبر البريد الإلكتروني.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٩. التواصل معنا</h2>
                <p className="text-slate-600 leading-relaxed">
                  للاستفسارات: <strong>Maen.hadayed@gmail.com</strong>
                </p>
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
                  PayNest is a cloud-based payroll and HR management platform designed for businesses in the MENA region. The platform enables management of employees, payroll, attendance, leaves, and reports.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">3. User Responsibilities</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li>Provide accurate and current information when registering.</li>
                  <li>Keep your login credentials confidential.</li>
                  <li>Not use the platform for illegal or harmful purposes.</li>
                  <li>Notify us immediately of any suspected unauthorized use of your account.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">4. Data Ownership</h2>
                <p className="text-slate-600 leading-relaxed">
                  Your company and employee data remains yours. We do not sell your data or share it with third parties except as described in our Privacy Policy.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">5. Disclaimer</h2>
                <p className="text-slate-600 leading-relaxed">
                  The platform is provided "as is" without express or implied warranties. PayNest is not liable for any financial losses or data loss resulting from use of the platform.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">6. Termination</h2>
                <p className="text-slate-600 leading-relaxed">
                  We reserve the right to terminate or suspend your account for violations of these terms. You may cancel your account at any time through account settings.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">7. Governing Law</h2>
                <p className="text-slate-600 leading-relaxed">
                  These terms are governed by the laws of the Hashemite Kingdom of Jordan. Jordanian courts shall have exclusive jurisdiction over any disputes arising from them.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">8. Changes to Terms</h2>
                <p className="text-slate-600 leading-relaxed">
                  We reserve the right to modify these terms at any time. You will be notified of material changes via email.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">9. Contact Us</h2>
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
```

- [ ] **Step 2: Commit**

```bash
cd /e/paynest && git add app/terms/page.tsx && git commit -m "feat: add bilingual Terms of Service page"
```

---

## Task 2: Contact Page

**Files:**
- Create: `app/contact/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
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
            <h1 className="text-2xl font-black text-slate-900">
              {ar ? "تواصل معنا" : "Contact Us"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {ar ? "نحن هنا للمساعدة" : "We're here to help"}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed">
            {ar
              ? "هل لديك سؤال أو تحتاج إلى دعم؟ تواصل معنا عبر البريد الإلكتروني أو واتساب وسنرد عليك في أقرب وقت ممكن."
              : "Have a question or need support? Reach out via email or WhatsApp and we'll get back to you as soon as possible."}
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <a
              href="mailto:Maen.hadayed@gmail.com"
              className="flex items-center gap-4 group"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <Mail size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700 group-hover:text-brand-700 transition-colors">
                  {ar ? "البريد الإلكتروني" : "Email"}
                </div>
                <div className="text-sm text-slate-500">Maen.hadayed@gmail.com</div>
              </div>
            </a>

            <div className="border-t border-slate-100" />

            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  {ar ? "واتساب" : "WhatsApp"}
                </div>
                <div className="text-sm text-slate-500">
                  {ar ? "متاح عند الطلب" : "Available on request"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
            <h3 className="font-semibold text-brand-900 mb-2">
              {ar ? "ساعات الدعم" : "Support Hours"}
            </h3>
            <p className="text-sm text-brand-700">
              {ar
                ? "الأحد – الخميس، ٩ صباحاً – ٦ مساءً (توقيت عمّان)"
                : "Sun – Thu, 9 AM – 6 PM (Amman time)"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /e/paynest && git add app/contact/page.tsx && git commit -m "feat: add bilingual Contact page"
```

---

## Task 3: About Page

**Files:**
- Create: `app/about/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Target, Users, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function AboutPage() {
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
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {ar ? "من نحن" : "About PayNest"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {ar ? "صُمّم لشركات الشرق الأوسط" : "Built for MENA businesses"}
            </p>
          </div>
        </div>

        <div className="space-y-10">
          {/* Mission */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target size={18} className="text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">{ar ? "مهمتنا" : "Our Mission"}</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {ar
                ? "نؤمن بأن إدارة الرواتب والموارد البشرية يجب أن تكون بسيطة وموثوقة وفعّالة لكل شركة في منطقة الشرق الأوسط، بغض النظر عن حجمها. PayNest يجمع كل ما تحتاجه في منصة واحدة متكاملة."
                : "We believe payroll and HR management should be simple, reliable, and efficient for every company in the MENA region, regardless of size. PayNest brings everything you need into one integrated platform."}
            </p>
          </section>

          {/* What we do */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{ar ? "ماذا نقدم" : "What We Do"}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Users, title: ar ? "إدارة الموظفين" : "Employee Management", desc: ar ? "إدارة كاملة لملفات الموظفين، الحضور، والإجازات" : "Complete employee records, attendance, and leave management" },
                { icon: Globe, title: ar ? "رواتب ذكية" : "Smart Payroll", desc: ar ? "احتساب دقيق للرواتب مع دعم للبدلات، الخصومات، والضمان الاجتماعي" : "Accurate payroll with support for allowances, deductions, and social security" },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                  <item.icon size={18} className="text-brand-600 mb-3" />
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Who it's for */}
          <section className="bg-gradient-to-br from-brand-50 to-brand-100/50 rounded-2xl border border-brand-100 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">{ar ? "لمن صُمّم PayNest؟" : "Who is PayNest for?"}</h2>
            <p className="text-slate-600 leading-relaxed">
              {ar
                ? "صُمّمت PayNest للشركات متوسطة الحجم (٢٠–٢٠٠ موظف) التي تحتاج إلى نظام موارد بشرية ورواتب قوي دون تعقيد أنظمة المؤسسات الكبيرة. مثالية للشركات في الأردن والمملكة العربية السعودية والإمارات وسائر دول المنطقة."
                : "PayNest is designed for mid-size companies (20–200 employees) that need a powerful HR and payroll system without the complexity of enterprise software. Ideal for businesses in Jordan, Saudi Arabia, UAE, and across the MENA region."}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /e/paynest && git add app/about/page.tsx && git commit -m "feat: add bilingual About page"
```

---

## Task 4: Wire Links — Signup Form + Home Footer

**Files:**
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Read the signup page submit button area**

Run: `grep -n "btn-primary\|submit\|Sign up\|Privacy" /e/paynest/app/\(auth\)/signup/page.tsx | head -20`

- [ ] **Step 2: Add ToS consent line below the signup submit button**

In `app/(auth)/signup/page.tsx`, find the submit button and add this line immediately after it (before the closing tag of the button's parent):

```typescript
<p className="text-xs text-slate-400 text-center mt-3">
  {ar
    ? <>بالتسجيل، أنت توافق على <button type="button" onClick={() => router.push("/terms")} className="underline hover:text-slate-600">شروط الاستخدام</button> و<button type="button" onClick={() => router.push("/privacy")} className="underline hover:text-slate-600">سياسة الخصوصية</button></>
    : <>By registering, you agree to our <button type="button" onClick={() => router.push("/terms")} className="underline hover:text-slate-600">Terms of Service</button> and <button type="button" onClick={() => router.push("/privacy")} className="underline hover:text-slate-600">Privacy Policy</button></>
  }
</p>
```

Make sure `ar` is defined from `useLanguage()` and `router` is from `useRouter()` — both should already be present.

- [ ] **Step 3: Add footer links in home page**

In `app/page.tsx`, find the `Footer` component's `<div className="flex items-center gap-5...">` section. It currently has: Privacy, Log In, Sign Up, Language toggle.

Add Terms, Contact, About buttons:

```typescript
<button onClick={() => router.push("/terms")} className="hover:text-slate-900 transition-colors">
  {ar ? "الشروط" : "Terms"}
</button>
<button onClick={() => router.push("/contact")} className="hover:text-slate-900 transition-colors">
  {ar ? "تواصل معنا" : "Contact"}
</button>
<button onClick={() => router.push("/about")} className="hover:text-slate-900 transition-colors">
  {ar ? "من نحن" : "About"}
</button>
```

Add these before the existing Privacy button.

- [ ] **Step 4: Commit**

```bash
cd /e/paynest && git add "app/(auth)/signup/page.tsx" app/page.tsx && git commit -m "feat: add ToS consent to signup and legal links to home footer"
```
