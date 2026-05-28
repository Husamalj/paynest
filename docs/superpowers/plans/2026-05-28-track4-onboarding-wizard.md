# Track 4: Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a 4-step onboarding wizard to new company owners on first login, then mark it complete so it never re-appears.

**Architecture:** Add `onboardingCompleted` boolean to the Company schema. After owner login, check the flag via a new API endpoint. If false, redirect to `/onboarding`. The wizard calls existing PATCH `/api/settings` and POST `/api/employees` routes — no new write endpoints. On completion, a new PATCH `/api/companies/onboarding-complete` flips the flag.

**Tech Stack:** Next.js 14, TypeScript, Prisma, existing `lib/auth.ts` JWT pattern

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `onboardingCompleted` to Company |
| `app/api/companies/onboarding-complete/route.ts` | Create | PATCH — flip onboardingCompleted = true |
| `app/api/companies/onboarding-status/route.ts` | Create | GET — return whether onboarding is needed |
| `app/onboarding/page.tsx` | Create | 4-step wizard UI |
| `app/(app)/layout.tsx` | Modify | Check onboarding status and redirect if needed |

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add field to Company model**

Open `prisma/schema.prisma`. In the `Company` model, after the `createdAt` field, add:

```prisma
onboardingCompleted Boolean @default(false) @map("onboarding_completed")
```

The Company model `createdAt` line currently reads:
```
createdAt     DateTime @default(now()) @map("created_at")
```

Add the new field right after it:
```
createdAt             DateTime @default(now()) @map("created_at")
onboardingCompleted   Boolean  @default(false) @map("onboarding_completed")
```

- [ ] **Step 2: Run migration**

```bash
cd /e/paynest && npx prisma migrate dev --name "add_onboarding_completed"
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd /e/paynest && npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
cd /e/paynest && git add prisma/schema.prisma prisma/migrations/ && git commit -m "feat: add onboardingCompleted flag to Company model"
```

---

## Task 2: Onboarding API Routes

**Files:**
- Create: `app/api/companies/onboarding-status/route.ts`
- Create: `app/api/companies/onboarding-complete/route.ts`

- [ ] **Step 1: Create onboarding-status route**

```typescript
// app/api/companies/onboarding-status/route.ts
import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req, ["owner"]);
    if (!session.companyId) return NextResponse.json({ needsOnboarding: false });
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { onboardingCompleted: true },
    });
    return NextResponse.json({ needsOnboarding: !company?.onboardingCompleted });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Create onboarding-complete route**

```typescript
// app/api/companies/onboarding-complete/route.ts
import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const session = await requireAuth(req, ["owner"]);
    if (!session.companyId) return NextResponse.json({ ok: true });
    await prisma.company.update({
      where: { id: session.companyId },
      data: { onboardingCompleted: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /e/paynest && git add app/api/companies/onboarding-status/route.ts app/api/companies/onboarding-complete/route.ts && git commit -m "feat: add onboarding status and complete API routes"
```

---

## Task 3: Onboarding Wizard Page

**Files:**
- Create: `app/onboarding/page.tsx`

- [ ] **Step 1: Create the wizard**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, Calculator, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const STEPS = [
  { id: 1, icon: Building2, title: "Company Profile",       titleAr: "ملف الشركة" },
  { id: 2, icon: Users,     title: "First Employees",       titleAr: "الموظفون الأوائل" },
  { id: 3, icon: Calculator,title: "Payroll Settings",      titleAr: "إعدادات الرواتب" },
  { id: 4, icon: CheckCircle2,title: "You're All Set!",     titleAr: "انتهيت!" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [companyName, setCompanyName] = useState(
    typeof window !== "undefined" ? localStorage.getItem("companyName") || "" : ""
  );
  const [currency, setCurrency] = useState("JOD");
  const [timezone, setTimezone] = useState("Asia/Amman");

  // Step 2
  const [employees, setEmployees] = useState([
    { name: "", email: "" },
  ]);

  // Step 3
  const [reqHours, setReqHours] = useState("8");
  const [monthDays, setMonthDays] = useState("26");
  const [workdays, setWorkdays] = useState("Sun,Mon,Tue,Wed,Thu");

  const addEmployee = () => {
    if (employees.length < 5) setEmployees([...employees, { name: "", email: "" }]);
  };
  const updateEmployee = (i: number, field: "name" | "email", val: string) => {
    setEmployees(employees.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  };

  const saveStep1 = async () => {
    setSaving(true); setError("");
    try {
      await api.patch("/settings", { companyName, currency, timezone });
      if (typeof window !== "undefined") localStorage.setItem("companyName", companyName);
      setStep(2);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveStep2 = async () => {
    setSaving(true); setError("");
    try {
      const filled = employees.filter((e) => e.name.trim());
      for (const emp of filled) {
        await api.post("/employees", { name: emp.name, email: emp.email || undefined }).catch(() => {});
      }
      setStep(3);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveStep3 = async () => {
    setSaving(true); setError("");
    try {
      await api.patch("/settings", {
        reqHours: parseFloat(reqHours),
        monthDays: parseInt(monthDays),
        workdays,
      });
      setStep(4);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await api.patch("/companies/onboarding-complete", {});
    } catch {}
    router.push("/dashboard");
  };

  const skip = async () => {
    try { await api.patch("/companies/onboarding-complete", {}); } catch {}
    router.push("/dashboard");
  };

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between">
        <span className="font-black text-[15px] text-slate-900">
          Pay<span className="text-brand-600">Nest</span>
        </span>
        <button onClick={skip} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          {ar ? "تخطي الإعداد" : "Skip setup"}
        </button>
      </header>

      {/* Step indicator */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.id ? "bg-brand-600 text-white" :
                step === s.id ? "bg-brand-600 text-white ring-4 ring-brand-100" :
                "bg-slate-100 text-slate-400"
              }`}>
                {step > s.id ? <CheckCircle2 size={14} /> : s.id}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step === s.id ? "text-brand-700" : "text-slate-400"}`}>
                {ar ? s.titleAr : s.title}
              </span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > s.id ? "bg-brand-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-elevated border border-slate-200/70 p-8 w-full max-w-xl">
          {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">{error}</div>}

          {/* Step 1: Company Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">{ar ? "ملف الشركة" : "Company Profile"}</h2>
                <p className="text-sm text-slate-500 mt-1">{ar ? "تأكيد معلومات شركتك الأساسية." : "Confirm your company's basic information."}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "اسم الشركة" : "Company Name"}</label>
                  <input className="form-input w-full" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "العملة" : "Currency"}</label>
                  <select className="form-input w-full" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="JOD">JOD — Jordanian Dinar</option>
                    <option value="SAR">SAR — Saudi Riyal</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EGP">EGP — Egyptian Pound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "المنطقة الزمنية" : "Timezone"}</label>
                  <select className="form-input w-full" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="Asia/Amman">Asia/Amman (Jordan)</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (Saudi Arabia)</option>
                    <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                    <option value="Africa/Cairo">Africa/Cairo (Egypt)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary w-full" onClick={saveStep1} disabled={saving || !companyName.trim()}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {ar ? "التالي" : "Next"} <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
              </button>
            </div>
          )}

          {/* Step 2: First Employees */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">{ar ? "إضافة موظفين" : "Add Employees"}</h2>
                <p className="text-sm text-slate-500 mt-1">{ar ? "أضف حتى 5 موظفين لتبدأ. يمكنك إضافة المزيد لاحقاً." : "Add up to 5 employees to get started. You can add more later."}</p>
              </div>
              <div className="space-y-3">
                {employees.map((emp, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="form-input flex-1" placeholder={ar ? "الاسم" : "Name"} value={emp.name} onChange={(e) => updateEmployee(i, "name", e.target.value)} />
                    <input className="form-input flex-1" placeholder={ar ? "البريد الإلكتروني (اختياري)" : "Email (optional)"} value={emp.email} onChange={(e) => updateEmployee(i, "email", e.target.value)} />
                  </div>
                ))}
                {employees.length < 5 && (
                  <button onClick={addEmployee} className="text-sm text-brand-600 hover:text-brand-800 font-medium">+ {ar ? "إضافة موظف آخر" : "Add another"}</button>
                )}
              </div>
              <div className="flex gap-3">
                <button className="btn btn-secondary flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft size={15} className={ar ? "rotate-180" : ""} /> {ar ? "السابق" : "Back"}
                </button>
                <button className="btn btn-primary flex-1" onClick={saveStep2} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {ar ? "التالي" : "Next"} <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
                </button>
              </div>
              <button onClick={() => setStep(3)} className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors">
                {ar ? "تخطي هذه الخطوة" : "Skip this step"}
              </button>
            </div>
          )}

          {/* Step 3: Payroll Settings */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">{ar ? "إعدادات الرواتب" : "Payroll Settings"}</h2>
                <p className="text-sm text-slate-500 mt-1">{ar ? "اضبط دورة العمل وساعات العمل." : "Configure your work cycle and hours."}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "ساعات العمل اليومية" : "Required Hours / Day"}</label>
                  <input type="number" className="form-input w-full" value={reqHours} onChange={(e) => setReqHours(e.target.value)} min="1" max="24" step="0.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "أيام العمل في الشهر" : "Working Days / Month"}</label>
                  <input type="number" className="form-input w-full" value={monthDays} onChange={(e) => setMonthDays(e.target.value)} min="20" max="31" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ar ? "أيام العمل الأسبوعية" : "Workdays"}</label>
                  <select className="form-input w-full" value={workdays} onChange={(e) => setWorkdays(e.target.value)}>
                    <option value="Sun,Mon,Tue,Wed,Thu">Sun–Thu (Middle East standard)</option>
                    <option value="Mon,Tue,Wed,Thu,Fri">Mon–Fri (Western standard)</option>
                    <option value="Sat,Sun,Mon,Tue,Wed,Thu,Fri">7 days a week</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-secondary flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft size={15} className={ar ? "rotate-180" : ""} /> {ar ? "السابق" : "Back"}
                </button>
                <button className="btn btn-primary flex-1" onClick={saveStep3} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {ar ? "التالي" : "Next"} <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{ar ? "كل شيء جاهز!" : "You're all set!"}</h2>
                <p className="text-sm text-slate-500 mt-2">
                  {ar
                    ? "تم إعداد شركتك. يمكنك الآن استخدام PayNest بالكامل."
                    : "Your company is configured. You can now use PayNest to its full potential."}
                </p>
              </div>
              <button className="btn btn-primary w-full" onClick={finish} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {ar ? "الانتقال إلى لوحة التحكم" : "Go to Dashboard"} <ArrowRight size={15} className={ar ? "rotate-180" : ""} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /e/paynest && git add app/onboarding/page.tsx && git commit -m "feat: add 4-step onboarding wizard for new company owners"
```

---

## Task 4: Wire Onboarding Redirect in App Layout

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Read the current layout**

Run: `cat /e/paynest/app/\(app\)/layout.tsx`

- [ ] **Step 2: Add onboarding check**

In `app/(app)/layout.tsx`, import `useRouter` and add an effect that checks onboarding status on mount for owner role. Find the existing `useEffect` that handles auth/session checks, and add this logic inside (or add a new `useEffect`):

```typescript
// After existing auth check
useEffect(() => {
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  if (role !== "owner") return;
  api.get("/companies/onboarding-status")
    .then((res: any) => {
      if (res.data?.needsOnboarding) router.replace("/onboarding");
    })
    .catch(() => {});
}, []);
```

Make sure `router` is from `useRouter()` — add the import if missing:
```typescript
import { useRouter } from "next/navigation";
```

- [ ] **Step 3: Commit**

```bash
cd /e/paynest && git add "app/(app)/layout.tsx" && git commit -m "feat: redirect new owners to onboarding wizard on first login"
```
