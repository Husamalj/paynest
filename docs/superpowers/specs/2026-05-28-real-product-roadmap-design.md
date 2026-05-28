# PayNest — Real Product Roadmap Design

**Target:** Mid-size companies (20–200 employees) with a dedicated HR manager  
**Constraint:** No billing/payment integration. Preserve all existing features.  
**Approach:** Foundation first — email infrastructure unlocks everything else.

---

## Track 1: Email Infrastructure

**Service:** Resend (resend.com) — REST API, free tier 3k emails/month, single npm package.

**Backend module:** `backend/src/utils/email.js`  
Exports one function per email type. Each function accepts a data object and calls the Resend API. Uses HTML templates inline (no template engine dependency).

**Email types (in send order):**
1. `sendWelcomeCompany(email, companyName, loginUrl)` — fired when super admin approves a company
2. `sendPasswordReset(email, resetUrl)` — fired when user requests reset; link expires in 1 hour
3. `sendEmailVerification(email, verifyUrl)` — fired on company signup; must verify before first login
4. `sendNewEmployeeCredentials(email, name, tempPassword, loginUrl)` — fired when HR creates an employee
5. `sendLeaveDecision(email, employeeName, status, startDate, endDate, reason?)` — fired on leave approve/reject
6. `sendPayslipReady(email, employeeName, period, portalUrl)` — fired after payroll run completes

**Environment:** `RESEND_API_KEY` added to `backend/.env` and `backend/.env.example`.

---

## Track 2: Auth Gaps

### 2a. Forgot Password Flow
- New frontend page: `app/(auth)/forgot-password/page.tsx` — email input form, white portal style
- New frontend page: `app/(auth)/reset-password/page.tsx` — token from URL query param, new password form
- Backend: `backend/src/routes/auth.js` — two new routes:
  - `POST /auth/forgot-password` — looks up user by email, creates token in DB, sends reset email
  - `POST /auth/reset-password` — validates token (not expired, not used), updates password, marks token used
- Database: new `password_reset_tokens` table — `(id, user_id, token, expires_at, used, created_at)`
- Token: 32-byte random hex, expires 1 hour
- "Forgot password?" link added to staff login and employee login pages

### 2b. Email Verification on Signup
- On company registration, send verification email before approval flow
- New flag `email_verified` (boolean, default false) on users table
- Backend: `GET /auth/verify-email?token=...` — marks user verified
- Frontend: `app/(auth)/verify-email/page.tsx` — shows success/error based on token validity
- Unverified companies see a "Check your email to verify your account" banner on login attempt

### 2c. Error Pages
- `app/not-found.tsx` — 404 page, white bg, PayNest logo linking home, friendly message
- `app/error.tsx` — runtime error boundary, same style, "Something went wrong" with retry button

---

## Track 3: Documents & Exports

### 3a. Payslip PDF Download
- Library: `@react-pdf/renderer` on the frontend (client-side PDF generation, no server needed)
- New component: `components/PayslipPDF.tsx` — renders a payslip as a PDF document
- Payslip content: company name, employee name, period, gross salary, deductions breakdown, bonuses, net pay, PayNest footer
- Download button added to the employee portal's payslip card and to the HR payroll page per-employee row
- Bilingual: renders in the user's current language

### 3b. Report Exports
- Library: `xlsx` (already in many Next.js projects, lightweight)
- Export button on the Reports page (`app/(app)/reports/page.tsx`) — downloads current view as `.xlsx`
- Payroll history export: table of employees × period with salary breakdown columns
- Attendance export: employee × date grid with status per day
- Leaves export: leave requests with employee name, type, dates, status

---

## Track 4: Onboarding Wizard

**Trigger:** Fires automatically after a new company owner logs in for the first time (tracked via `onboarding_completed` flag on the company record).

**Flow (4 steps, skippable after step 1):**
1. **Company profile** — confirm/edit company name, upload logo, set timezone and currency
2. **First employees** — add up to 5 employees inline (name, email, role) or skip to do later
3. **Payroll settings** — set pay cycle (monthly/biweekly), payroll currency, working hours/day
4. **Invite HR manager** — optional: invite an HR user by email

**Frontend:** `app/onboarding/page.tsx` — step indicator at top, card-based layout, skip buttons  
**Backend:** `PATCH /api/settings` already exists — wizard calls it with the collected data  
**Completion:** Sets `onboarding_completed = true` on the company, redirects to `/dashboard`

---

## Track 5: Legal & Trust Pages

### 5a. Terms of Service — `app/terms/page.tsx`
- Same layout as privacy page (white bg, sticky header with PayNest→home)
- Bilingual (EN + AR)
- Covers: acceptance of terms, use of service, user responsibilities, data ownership, termination, governing law (Jordan)
- Link added to signup page form footer ("By registering you agree to our Terms of Service and Privacy Policy")
- Link added to home footer alongside Privacy

### 5b. Contact Page — `app/contact/page.tsx`
- Simple page: email address (Maen.hadayed@gmail.com), WhatsApp/phone if desired
- No contact form (avoids spam, no backend needed)
- Link in home footer

### 5c. About Page — `app/about/page.tsx`
- What PayNest is, who it's for, the mission ("Built for MENA businesses")
- Can include team section (placeholder or real)
- Link in home footer

---

## Track 6: Workflow Depth

### 6a. In-App Notification Center
- Bell icon in the app header (existing `components/Layout.tsx`)
- Dropdown showing last 20 notifications: leave requests pending, leaves approved/rejected, announcements, payroll run
- Backend: new `notifications` table — `(id, user_id, type, message, read, created_at, link)`
- New API: `GET /api/notifications` (paginated), `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`
- Badge count on bell icon (unread count)
- Notifications created server-side when: leave submitted, leave decided, payroll run, announcement posted

### 6b. Payroll Approval Flow
- Before a payroll run can be executed, owner must approve it
- New `payroll_runs` status field: `draft → pending_approval → approved → paid`
- HR creates the run (draft), submits for approval → owner gets notification + email
- Owner sees a "Pending Approval" banner on the payroll page with approve/reject
- Rejected run returns to draft with a comment

### 6c. Leave Approval Flow Improvement
- Currently leaves may be approved without notifications
- Wire `sendLeaveDecision` email into the leave approve/reject API routes
- Add notification record to notification center on each decision
- Employee sees leave status update in real-time on their portal

---

## Implementation Order

1. Email infrastructure (`backend/src/utils/email.js` + Resend setup)
2. Auth gaps (forgot password, reset password, email verification, error pages)
3. Documents (payslip PDF, report exports)
4. Onboarding wizard
5. Legal & trust pages (ToS, Contact, About)
6. Workflow depth (notifications, payroll approval, leave flow wiring)

Each track is independent after Track 1 is done. Tracks 4, 5, and 6 can run in parallel once email is wired.

---

## Tech Decisions

| Concern | Decision | Reason |
|---------|----------|--------|
| Email API | Resend | Simple REST API, generous free tier, good deliverability |
| PDF generation | @react-pdf/renderer | Client-side, no server needed, React component model |
| Excel export | xlsx (SheetJS) | Lightweight, no server needed, wide format support |
| Token storage | postgres table | Already using Postgres/Prisma, no extra infra |
| Notification storage | postgres table | Same as above; polling is fine for this scale |
