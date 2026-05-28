# PayNest UI Fixes & Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix login redirect bug, restyle signup page, add Privacy + Pricing pages, simplify home nav, and make the PayNest logo a home link on all portal/auth headers.

**Architecture:** All changes are frontend-only (Next.js App Router). Fix the axios interceptor so 401 on `/auth/login` doesn't redirect to home. Restyle the signup page to share the same white-background portal design used by the staff/HR login pages. Add two static pages (Privacy, Pricing) and simplify the landing nav to link to them.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, axios, lucide-react

---

## Codebase Enhancement Notes

Before diving into tasks, here's what else could be improved (for reference — not in this plan):
- The `app/(auth)/hr-login/page.tsx` and `owner-login/page.tsx` are just empty redirects — they could be removed and the routes consolidated.
- The home page trust strip uses placeholder company names/icons — should be replaced with real testimonials.
- The employee portal header has no way to navigate back to a home/landing page.
- The `app/(app)/layout.tsx` redirects `role=owner` away to `/owner-portal` but the nav still shows the full sidebar.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/api.ts` | Modify | Skip `logoutUser()` redirect for login endpoint 401s |
| `app/(auth)/login/page.tsx` | Modify | Make PayNest header text a clickable home link |
| `app/(auth)/employee-login/page.tsx` | Modify | Make PayNest header text a clickable home link |
| `app/portal-select/page.tsx` | Modify | Make PayNest header text a clickable home link |
| `app/(auth)/signup/page.tsx` | Modify | Restyle from dark `bg-slate-950` to white portal style |
| `app/page.tsx` | Modify | Simplify nav (remove fake dropdowns), add Privacy + Pricing links |
| `app/privacy/page.tsx` | Create | Privacy policy page |
| `app/pricing/page.tsx` | Create | Pricing page |

---

## Task 1: Fix Login 401 Redirect Bug

**Problem:** In `lib/api.ts`, any 401 response triggers `logoutUser()` which calls `window.location.href = "/"`. A failed login attempt on `/auth/login` returns 401 (wrong password), which causes the page to redirect to home instead of showing the error message.

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Open `lib/api.ts` and locate the 401 handler in the response interceptor (around line 34)**

The current code:
```typescript
if (status === 401) {
  logoutUser();
  return Promise.reject(new Error("Session expired. Please login again."));
}
```

- [ ] **Step 2: Replace the 401 handler with a check that skips redirect for the login endpoint**

Replace the `if (status === 401)` block with:
```typescript
if (status === 401) {
  const url: string = error.config?.url || "";
  if (!url.includes("/auth/login")) {
    logoutUser();
    return Promise.reject(new Error("Session expired. Please login again."));
  }
  return Promise.reject(new Error(message));
}
```

The full updated interceptor in `lib/api.ts`:
```typescript
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: any) => {
    const status = error.response?.status;
    const isTimeout = error.code === "ECONNABORT" || error.message?.includes("timeout");
    const message = isTimeout
      ? "Server is waking up, please try again in a moment."
      : (typeof error.response?.data?.error === "string" ? error.response.data.error : null) ||
        error.message ||
        "Request failed";

    console.error("API Error:", status, message);

    if (status === 401) {
      const url: string = error.config?.url || "";
      if (!url.includes("/auth/login")) {
        logoutUser();
        return Promise.reject(new Error("Session expired. Please login again."));
      }
      return Promise.reject(new Error(message));
    }
    if (status === 403) {
      if (message.toLowerCase().includes("inactive") || message.toLowerCase().includes("forbidden")) {
        logoutUser();
      }
      return Promise.reject(new Error(message));
    }
    return Promise.reject(new Error(message));
  }
);
```

- [ ] **Step 3: Verify the error state is being set correctly in all three login pages**

In `app/(auth)/login/page.tsx`, the catch block already does:
```typescript
} catch (err: any) {
  setError(err.message);
}
```
This is correct — the error message will now show inline instead of redirecting. Same for `app/(auth)/employee-login/page.tsx`. No changes needed in the login page components.

- [ ] **Step 4: Commit**
```bash
git add lib/api.ts
git commit -m "fix: prevent login 401 from redirecting to home page"
```

---

## Task 2: Make PayNest Logo a Home Link in All Auth/Portal Headers

**Problem:** The PayNest text in the slim headers of `portal-select`, `login`, and `employee-login` pages is a plain `<div>` with no click action. Users can't navigate back to home by clicking it.

**Files:**
- Modify: `app/portal-select/page.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/employee-login/page.tsx`

- [ ] **Step 1: Update `app/portal-select/page.tsx` — make the PayNest `<div>` a `<button>`**

Find this block in the `<header>` (around line 47):
```tsx
<div className="font-bold text-slate-900 text-[15px]">
  Pay<span className="text-brand-600">Nest</span>
</div>
```

Replace with:
```tsx
<button
  onClick={() => router.push("/")}
  className="font-bold text-slate-900 text-[15px] hover:opacity-70 transition-opacity"
>
  Pay<span className="text-brand-600">Nest</span>
</button>
```

- [ ] **Step 2: Update `app/(auth)/login/page.tsx` — same change in the header**

Find this block in the `<header>`:
```tsx
<div className="font-bold text-slate-900 text-[15px]">
  Pay<span className="text-brand-600">Nest</span>
</div>
```

Replace with:
```tsx
<button
  onClick={() => router.push("/")}
  className="font-bold text-slate-900 text-[15px] hover:opacity-70 transition-opacity"
>
  Pay<span className="text-brand-600">Nest</span>
</button>
```

- [ ] **Step 3: Update `app/(auth)/employee-login/page.tsx` — same change in the header**

Find this block in the `<header>`:
```tsx
<div className="font-bold text-slate-900 text-[15px]">
  Pay<span className="text-brand-600">Nest</span>
</div>
```

Replace with:
```tsx
<button
  onClick={() => router.push("/")}
  className="font-bold text-slate-900 text-[15px] hover:opacity-70 transition-opacity"
>
  Pay<span className="text-brand-600">Nest</span>
</button>
```

- [ ] **Step 4: Commit**
```bash
git add app/portal-select/page.tsx app/\(auth\)/login/page.tsx app/\(auth\)/employee-login/page.tsx
git commit -m "feat: make PayNest logo a home link in all auth headers"
```

---

## Task 3: Restyle Register Company Page to Match Portal Design

**Problem:** The signup page (`app/(auth)/signup/page.tsx`) uses a dark `bg-slate-950` background. The staff portal and HR portal pages use a clean white/light design (`bg-slate-50` with a slim header). The user wants the signup page to match that style.

**Files:**
- Modify: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Replace the entire content of `app/(auth)/signup/page.tsx` with the portal-style design**

The full new content (same structure as `app/(auth)/login/page.tsx` but with the registration form):

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, ArrowLeft, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import api from "@/lib/api";

function LangToggle() {
  const { lang, toggleLanguage } = useLanguage();
  return (
    <button
      onClick={() => toggleLanguage()}
      className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm transition-colors"
    >
      <Globe size={15} />
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  const [form, setForm] = useState({
    companyName: "",
    slug: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === "companyName" && !slugTouched) {
        next.slug = val
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      }
      if (field === "slug") setSlugTouched(true);
      return next;
    });
  };

  const slugValid = /^[a-z0-9][a-z0-9-]*$/.test(form.slug);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!slugValid) {
      setError(
        ar
          ? "المعرّف يجب أن يحتوي على أحرف إنجليزية وأرقام فقط"
          : "Slug must contain only English letters and numbers"
      );
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(
        ar ? "كلمتا السر غير متطابقتين" : "Passwords do not match"
      );
      return;
    }
    if (form.password.length < 6) {
      setError(
        ar
          ? "كلمة السر يجب أن تكون 6 أحرف على الأقل"
          : "Password must be at least 6 characters"
      );
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/register-company", {
        companyName: form.companyName,
        slug: form.slug,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
      });
      if (res.data.pending) {
        setPending(true);
        return;
      }
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("paynest_logged_in", "true");
      localStorage.setItem("role", user.role);
      localStorage.setItem("user", JSON.stringify(user));
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative min-h-screen flex flex-col bg-slate-50"
    >
      {/* Soft brand radial blob */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(12, 140, 232, 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Slim header */}
      <header className="relative bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between">
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
        <LangToggle />
      </header>

      {/* Main */}
      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl shadow-elevated border border-slate-200/70 p-8"
          >
            {/* Icon + title */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Building2 size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-center text-slate-900 mb-1">
              {ar ? "تسجيل شركة جديدة" : "Register Your Company"}
            </h1>
            <p className="text-center text-slate-400 text-xs mb-6">
              Pay<span className="text-brand-600">Nest</span>
            </p>

            {/* Company Name */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "اسم الشركة" : "Company Name"}
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={set("companyName")}
              placeholder={ar ? "مثال: شركة النجوم" : "e.g. Stars Corp"}
              required
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {/* Slug */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "المعرّف (Slug)" : "Slug (unique ID)"}
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={set("slug")}
              onBlur={() => setSlugTouched(true)}
              placeholder="my-company"
              required
              dir="ltr"
              className={`w-full mb-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors bg-slate-50 focus:bg-white ${
                form.slug && !slugValid ? "border-red-400" : "border-slate-200"
              }`}
            />
            <p className="text-xs text-slate-400 mb-4">
              {ar
                ? "أحرف إنجليزية وأرقام وشرطة فقط — مثال: my-company"
                : "English letters, numbers, and hyphens only — e.g. my-company"}
            </p>

            {/* Owner Name */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "اسم المالك" : "Owner Name"}
            </label>
            <input
              type="text"
              value={form.ownerName}
              onChange={set("ownerName")}
              placeholder={ar ? "الاسم الكامل" : "Full name"}
              required
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {/* Email */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "البريد الإلكتروني" : "Email"}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="email@company.com"
              required
              dir="ltr"
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {/* Password */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "كلمة السر" : "Password"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder={ar ? "6 أحرف على الأقل" : "At least 6 characters"}
              required
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {/* Confirm Password */}
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {ar ? "تأكيد كلمة السر" : "Confirm Password"}
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              placeholder={ar ? "أعد كتابة كلمة السر" : "Repeat password"}
              required
              className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors"
            />

            {error && (
              <div className="text-red-600 text-sm mb-4 text-center bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {pending && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm text-center mb-4">
                {ar
                  ? "تم التسجيل بنجاح. سيتم مراجعة طلبك من قِبل الإدارة قريباً."
                  : "Registration submitted! Awaiting admin approval before you can log in."}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60 mb-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 transition-all shadow-sm text-sm"
            >
              {loading
                ? ar
                  ? "جاري التسجيل..."
                  : "Creating account..."
                : ar
                ? "إنشاء الحساب"
                : "Create Account"}
            </button>

            <p className="text-center text-slate-400 text-xs">
              {ar ? "لديك حساب؟ " : "Already have an account? "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-brand-600 hover:underline font-medium"
              >
                {ar ? "سجّل دخولك" : "Sign in"}
              </button>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add app/\(auth\)/signup/page.tsx
git commit -m "feat: restyle signup page to match portal white design"
```

---

## Task 4: Create Privacy Policy Page

**Files:**
- Create: `app/privacy/page.tsx`

- [ ] **Step 1: Create `app/privacy/page.tsx`**

```tsx
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

        <div className="prose prose-slate max-w-none space-y-8">
          {ar ? (
            <>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">١. مقدمة</h2>
                <p className="text-slate-600 leading-relaxed">
                  تلتزم PayNest ("نحن"، "لنا"، "الشركة") بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيفية جمع معلوماتك واستخدامها والكشف عنها وحمايتها عند استخدام منصتنا لإدارة الرواتب والموارد البشرية.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٢. المعلومات التي نجمعها</h2>
                <p className="text-slate-600 leading-relaxed mb-3">قد نجمع الأنواع التالية من المعلومات:</p>
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
                <p className="text-slate-600 leading-relaxed">
                  لا نبيع بياناتك الشخصية لأطراف ثالثة. قد نشارك بياناتك فقط في الحالات التالية:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-600 mt-3">
                  <li>مع مزودي الخدمة الذين يساعدوننا في تشغيل المنصة (مثل خدمات الاستضافة).</li>
                  <li>عند الطلب من جهات قانونية أو حكومية وفقاً للقوانين المعمول بها.</li>
                  <li>لحماية حقوقنا أو حقوق مستخدمينا في حالة وجود نزاع.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٥. أمان البيانات</h2>
                <p className="text-slate-600 leading-relaxed">
                  نستخدم تشفير HTTPS لجميع الاتصالات، وتشفير كلمات السر باستخدام bcrypt، ونظام تحكم في الوصول قائم على الأدوار. رغم اتخاذنا جميع الإجراءات المعقولة، لا يمكن ضمان الأمان التام لأي نظام رقمي.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٦. الاحتفاظ بالبيانات</h2>
                <p className="text-slate-600 leading-relaxed">
                  نحتفظ ببياناتك طالما كان حسابك نشطاً أو حسب الحاجة لتقديم خدماتنا. عند طلب الحذف، نزيل بياناتك في غضون 30 يوماً، مع الاحتفاظ بما يلزم قانونياً.
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
                <h2 className="text-lg font-bold text-slate-900 mb-3">٨. ملفات تعريف الارتباط (Cookies)</h2>
                <p className="text-slate-600 leading-relaxed">
                  تستخدم منصتنا ملفات تعريف الارتباط الضرورية فقط للحفاظ على جلسة تسجيل الدخول وتفضيلات اللغة. لا نستخدم ملفات تعريف الارتباط لأغراض تتبع إعلانية.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">٩. التغييرات على هذه السياسة</h2>
                <p className="text-slate-600 leading-relaxed">
                  قد نحدث هذه السياسة من وقت لآخر. سيتم إخطارك بالتغييرات الجوهرية عبر البريد الإلكتروني أو من خلال إشعار على المنصة.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">١٠. التواصل معنا</h2>
                <p className="text-slate-600 leading-relaxed">
                  لأي استفسارات تتعلق بهذه السياسة، يرجى التواصل معنا عبر البريد الإلكتروني: <strong>privacy@paynest.app</strong>
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">1. Introduction</h2>
                <p className="text-slate-600 leading-relaxed">
                  PayNest ("we", "us", "the Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our payroll and HR management platform.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">2. Information We Collect</h2>
                <p className="text-slate-600 leading-relaxed mb-3">We may collect the following types of information:</p>
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
                <p className="text-slate-600 leading-relaxed">
                  We do not sell your personal data to third parties. We may share your data only in these circumstances:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-600 mt-3">
                  <li>With service providers who help us operate the platform (e.g., hosting services).</li>
                  <li>When required by legal or governmental authorities under applicable laws.</li>
                  <li>To protect our rights or those of our users in a dispute.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">5. Data Security</h2>
                <p className="text-slate-600 leading-relaxed">
                  We use HTTPS encryption for all communications, bcrypt password hashing, and a role-based access control system. While we take reasonable precautions, no digital system can guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">6. Data Retention</h2>
                <p className="text-slate-600 leading-relaxed">
                  We retain your data for as long as your account is active or as needed to provide our services. Upon a deletion request, we remove your data within 30 days, retaining only what is legally required.
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
                  Our platform uses only essential cookies to maintain your login session and language preferences. We do not use cookies for advertising or tracking purposes.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">9. Changes to This Policy</h2>
                <p className="text-slate-600 leading-relaxed">
                  We may update this policy from time to time. You will be notified of material changes via email or through a notice on the platform.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-3">10. Contact Us</h2>
                <p className="text-slate-600 leading-relaxed">
                  For any questions about this policy, please contact us at: <strong>privacy@paynest.app</strong>
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
git add app/privacy/page.tsx
git commit -m "feat: add privacy policy page (EN + AR)"
```

---

## Task 5: Create Pricing Page

**Files:**
- Create: `app/pricing/page.tsx`

- [ ] **Step 1: Create `app/pricing/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function PricingPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const Back = ar ? ArrowRight : ArrowLeft;

  const plans = ar
    ? [
        {
          name: "المبتدئ",
          price: "مجاناً",
          sub: "للبدء",
          features: [
            "حتى 10 موظفين",
            "إدارة الرواتب الأساسية",
            "بوابة الموظف",
            "تتبع الحضور",
            "دعم عبر البريد الإلكتروني",
          ],
          cta: "ابدأ مجاناً",
          highlight: false,
        },
        {
          name: "الأعمال",
          price: "٤٩ دولار",
          sub: "شهرياً",
          features: [
            "حتى 100 موظف",
            "كل مميزات المبتدئ",
            "تقارير وتحليلات متقدمة",
            "إدارة الإجازات والمكافآت",
            "دعم ذو أولوية",
            "سجل التدقيق",
          ],
          cta: "ابدأ التجربة المجانية",
          highlight: true,
        },
        {
          name: "المؤسسات",
          price: "تواصل معنا",
          sub: "للشركات الكبيرة",
          features: [
            "موظفون غير محدودين",
            "كل مميزات الأعمال",
            "تكاملات مخصصة",
            "مدير حساب مخصص",
            "اتفاقية مستوى الخدمة (SLA)",
            "دعم على مدار الساعة",
          ],
          cta: "تواصل مع المبيعات",
          highlight: false,
        },
      ]
    : [
        {
          name: "Starter",
          price: "Free",
          sub: "to get started",
          features: [
            "Up to 10 employees",
            "Basic payroll management",
            "Employee portal",
            "Attendance tracking",
            "Email support",
          ],
          cta: "Get Started Free",
          highlight: false,
        },
        {
          name: "Business",
          price: "$49",
          sub: "per month",
          features: [
            "Up to 100 employees",
            "Everything in Starter",
            "Advanced reports & analytics",
            "Leaves & bonuses management",
            "Priority support",
            "Audit log",
          ],
          cta: "Start Free Trial",
          highlight: true,
        },
        {
          name: "Enterprise",
          price: "Contact us",
          sub: "for large teams",
          features: [
            "Unlimited employees",
            "Everything in Business",
            "Custom integrations",
            "Dedicated account manager",
            "SLA guarantee",
            "24/7 support",
          ],
          cta: "Contact Sales",
          highlight: false,
        },
      ];

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

      {/* Hero */}
      <section className="text-center py-14 px-4">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
          {ar ? "خطط الأسعار" : "Simple, Transparent Pricing"}
        </h1>
        <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
          {ar
            ? "ابدأ مجاناً وقم بالترقية عندما تكون مستعداً. لا رسوم خفية، لا مفاجآت."
            : "Start free and upgrade when you're ready. No hidden fees, no surprises."}
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-6 border flex flex-col gap-4 ${
              plan.highlight
                ? "bg-gradient-to-br from-brand-600 to-brand-700 border-transparent text-white shadow-elevated"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div>
              <div
                className={`text-sm font-bold uppercase tracking-wide mb-1 ${
                  plan.highlight ? "text-brand-100" : "text-slate-500"
                }`}
              >
                {plan.name}
              </div>
              <div className="text-3xl font-black">{plan.price}</div>
              <div
                className={`text-xs mt-0.5 ${
                  plan.highlight ? "text-brand-200" : "text-slate-400"
                }`}
              >
                {plan.sub}
              </div>
            </div>

            <ul className="space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2
                    size={15}
                    className={`mt-0.5 flex-shrink-0 ${
                      plan.highlight ? "text-brand-200" : "text-emerald-500"
                    }`}
                  />
                  <span className={plan.highlight ? "text-white/90" : "text-slate-600"}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => router.push("/signup")}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                plan.highlight
                  ? "bg-white text-brand-700 hover:bg-brand-50"
                  : "bg-brand-600 text-white hover:bg-brand-700"
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add app/pricing/page.tsx
git commit -m "feat: add pricing page with 3-tier plan cards"
```

---

## Task 6: Update Home Page Navigation

**Problem:** The home page TopNav has 5 dropdown buttons (Product, Features, Pricing, Resources, Company) that all do nothing — they have no `onClick` handlers and no linked pages. The footer also has no Privacy link. The user wants to clean these up: keep only the important items (Pricing, Privacy) with real pages behind them, and remove the useless decorative dropdowns.

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the `TopNav` component's `<nav>` block in `app/page.tsx`**

Find this block (around line 30–45 in the file, inside `TopNav`):
```tsx
<nav className="flex items-center">
  <NavItem label={ar ? "المنتج" : "Product"} />
  <NavItem label={ar ? "المميزات" : "Features"} />
  <button className="hidden md:inline-flex text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-2">
    {ar ? "الأسعار" : "Pricing"}
  </button>
  <NavItem label={ar ? "الموارد" : "Resources"} />
  <NavItem label={ar ? "الشركة" : "Company"} />
</nav>
```

Replace with:
```tsx
<nav className="flex items-center">
  <button
    onClick={() => router.push("/pricing")}
    className="hidden md:inline-flex text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-2 transition-colors"
  >
    {ar ? "الأسعار" : "Pricing"}
  </button>
  <button
    onClick={() => router.push("/privacy")}
    className="hidden md:inline-flex text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-2 transition-colors"
  >
    {ar ? "الخصوصية" : "Privacy"}
  </button>
</nav>
```

Also remove the `NavItem` helper component and the `ChevronDown` import (they're no longer used) — but only if `ChevronDown` is not used elsewhere in the file. Check: `ChevronDown` is imported from lucide-react and used only in `NavItem`. The `NavItem` component is defined inside `TopNav`. Remove the `NavItem` function definition and remove `ChevronDown` from the import list.

Updated imports in `app/page.tsx` (remove `ChevronDown` from the lucide-react import):
```tsx
import {
  ArrowRight, Wallet, Clock, UserCircle, BarChart3, ShieldCheck, TrendingUp,
  Globe, LogIn, PlayCircle, CheckCircle2, Sparkles, Building2,
  Flower2, Sun, Sparkle, Diamond, Hexagon,
} from "lucide-react";
```

- [ ] **Step 2: Update the `Footer` component in `app/page.tsx` to add Privacy and Pricing links**

Find the existing Footer links block (around line 220 in the file):
```tsx
<div className="flex items-center gap-5 text-sm text-slate-500">
  <button onClick={() => router.push("/portal-select")} className="hover:text-slate-900 transition-colors">
    {ar ? "تسجيل الدخول" : "Log In"}
  </button>
  <button onClick={() => router.push("/signup")} className="hover:text-slate-900 transition-colors">
    {ar ? "إنشاء حساب" : "Sign Up"}
  </button>
  <button onClick={() => toggleLanguage()} className="hover:text-slate-900 transition-colors inline-flex items-center gap-1">
    <Globe size={13} />
    {ar ? "English" : "العربية"}
  </button>
</div>
```

Replace with:
```tsx
<div className="flex items-center gap-5 text-sm text-slate-500">
  <button onClick={() => router.push("/pricing")} className="hover:text-slate-900 transition-colors">
    {ar ? "الأسعار" : "Pricing"}
  </button>
  <button onClick={() => router.push("/privacy")} className="hover:text-slate-900 transition-colors">
    {ar ? "الخصوصية" : "Privacy"}
  </button>
  <button onClick={() => router.push("/portal-select")} className="hover:text-slate-900 transition-colors">
    {ar ? "تسجيل الدخول" : "Log In"}
  </button>
  <button onClick={() => router.push("/signup")} className="hover:text-slate-900 transition-colors">
    {ar ? "إنشاء حساب" : "Sign Up"}
  </button>
  <button onClick={() => toggleLanguage()} className="hover:text-slate-900 transition-colors inline-flex items-center gap-1">
    <Globe size={13} />
    {ar ? "English" : "العربية"}
  </button>
</div>
```

- [ ] **Step 3: Commit**
```bash
git add app/page.tsx
git commit -m "feat: simplify home nav with Pricing/Privacy links, update footer"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Task |
|-------------|------|
| Privacy tab on home page + legal pages | Task 4 (privacy page) + Task 6 (nav link) |
| Remove unimportant nav items, add page for each kept | Task 6 (removed Product/Features/Resources/Company, added Pricing + Privacy pages) |
| Login wrong password stays on page, shows error | Task 1 (fix 401 redirect in api.ts) |
| Register company UI matches portal style (white bg) | Task 3 |
| PayNest logo in all headers → home page | Task 2 |

### Placeholder Scan
No placeholders found. All code blocks are complete and executable.

### Type Consistency
- `router.push("/pricing")` and `router.push("/privacy")` — these routes match `app/pricing/page.tsx` and `app/privacy/page.tsx` created in Tasks 4 and 5. ✓
- `useLanguage()` used consistently across all new pages. ✓
- `useRouter()` used consistently across all new pages. ✓
