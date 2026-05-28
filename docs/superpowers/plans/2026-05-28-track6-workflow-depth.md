# Track 6: Workflow Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app notification center (bell icon → dropdown with last 20 notifications), wire leave decision emails (Track 1 prerequisite), and add notifications on key events (leave submitted, leave decided, payroll run completed).

**Architecture:** New `Notification` Prisma model. Three new API routes (GET list, PATCH read-one, PATCH read-all). Bell icon added to the existing `app/(app)/layout.tsx` header. Notifications created server-side in existing API routes for leave and payroll events. Leave email wiring calls `sendLeaveDecision` from `lib/email.ts` (Track 1).

**Tech Stack:** Next.js 14, TypeScript, Prisma, existing JWT auth pattern, `lib/email.ts` (Track 1)

**Prerequisites:** Track 1 (email infrastructure) must be complete before Task 5 (leave email wiring).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `Notification` model |
| `app/api/notifications/route.ts` | Create | GET paginated list + POST create |
| `app/api/notifications/[id]/read/route.ts` | Create | PATCH mark single notification read |
| `app/api/notifications/read-all/route.ts` | Create | PATCH mark all notifications read |
| `app/(app)/layout.tsx` | Modify | Add bell icon with badge + dropdown |
| `app/api/leaves/[id]/route.ts` | Modify | Create notification on leave decision |
| `app/api/payroll/calculate/route.ts` | Modify | Create notification after payroll run |

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Notification model**

Open `prisma/schema.prisma`. Add the Notification model at the end of the file (before the final closing):

```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  companyId Int      @map("company_id")
  userId    Int?     @map("user_id")
  type      String   @db.VarChar(50)
  message   String
  link      String?  @db.VarChar(255)
  read      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId, read, createdAt])
  @@map("notifications")
}
```

Also add the relation back-reference to the `Company` model. In the `Company` model, after the `auditLogs` relation line, add:
```prisma
notifications Notification[]
```

- [ ] **Step 2: Run migration**

```bash
cd /e/paynest && npx prisma migrate dev --name "add_notifications"
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate client**

```bash
cd /e/paynest && npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
cd /e/paynest && git add prisma/schema.prisma prisma/migrations/ && git commit -m "feat: add Notification model to schema"
```

---

## Task 2: Notification API Routes

**Files:**
- Create: `app/api/notifications/route.ts`
- Create: `app/api/notifications/[id]/read/route.ts`
- Create: `app/api/notifications/read-all/route.ts`

- [ ] **Step 1: Create main notifications route (GET list)**

```typescript
// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const notifications = await prisma.notification.findMany({
      where: {
        companyId: session.companyId!,
        OR: [{ userId: null }, { userId: session.userId }],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        companyId: session.companyId!,
        read: false,
        OR: [{ userId: null }, { userId: session.userId }],
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Create read-one route**

```typescript
// app/api/notifications/[id]/read/route.ts
import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(req);
    const id = parseInt(params.id);
    await prisma.notification.updateMany({
      where: { id, companyId: session.companyId! },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 3: Create read-all route**

```typescript
// app/api/notifications/read-all/route.ts
import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const session = await requireAuth(req);
    await prisma.notification.updateMany({
      where: { companyId: session.companyId!, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /e/paynest && git add app/api/notifications/route.ts "app/api/notifications/[id]/read/route.ts" app/api/notifications/read-all/route.ts && git commit -m "feat: add notifications API routes (list, read-one, read-all)"
```

---

## Task 3: Notification Bell in App Layout

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Read the current layout header**

Run: `cat /e/paynest/app/\(app\)/layout.tsx | head -80`

- [ ] **Step 2: Add the NotificationBell component**

Add this component definition BEFORE the `export default` in `app/(app)/layout.tsx`:

```typescript
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.get("/notifications?limit=20");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const markAllRead = async () => {
    try { await api.patch("/notifications/read-all"); setUnreadCount(0); setNotifications((n) => n.map((x) => ({ ...x, read: true }))); } catch {}
  };

  const markRead = async (id: number) => {
    try { await api.patch(`/notifications/${id}/read`); setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x)); setUnreadCount((c) => Math.max(0, c - 1)); } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-elevated border border-slate-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-800 font-medium">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? "bg-brand-50/40" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />}
                    <div className={!n.read ? "" : "pl-4"}>
                      <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add required imports**

At the top of `app/(app)/layout.tsx`, add/ensure these imports exist:
```typescript
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import api from "@/lib/api";
```

- [ ] **Step 4: Add NotificationBell to the header**

In the layout's header JSX, find where the user avatar or logout button is rendered and add `<NotificationBell />` just before it.

- [ ] **Step 5: Commit**

```bash
cd /e/paynest && git add "app/(app)/layout.tsx" && git commit -m "feat: add notification bell with dropdown to app layout"
```

---

## Task 4: Create Notifications on Leave Decisions

**Files:**
- Modify: `app/api/leaves/[id]/route.ts`

- [ ] **Step 1: Read the current leave route**

Run: `cat "/e/paynest/app/api/leaves/[id]/route.ts"`

- [ ] **Step 2: Add notification creation after leave status update**

Find the PUT handler's section where `prisma.leaveRequest.update(...)` succeeds. After the update, add:

```typescript
// Create in-app notification for HR/owner
if (status === "approved" || status === "rejected") {
  const msg = `Leave request for ${updatedLeave.employeeName} has been ${status}.`;
  prisma.notification.create({
    data: {
      companyId: session.companyId!,
      type: "leave_decision",
      message: msg,
      link: "/leaves",
    },
  }).catch((e) => console.error("[notification]", e));
}
```

Add the prisma import at the top if not already there:
```typescript
import { prisma } from "@/lib/prisma";
```

- [ ] **Step 3: Commit**

```bash
cd /e/paynest && git add "app/api/leaves/[id]/route.ts" && git commit -m "feat: create notification when leave is decided"
```

---

## Task 5: Create Notifications on Leave Submission

**Files:**
- Modify: `app/api/leaves/route.ts` (the POST handler for new leave requests)

- [ ] **Step 1: Read the leaves POST route**

Run: `cat /e/paynest/app/api/leaves/route.ts | head -60`

- [ ] **Step 2: Add notification after leave creation**

Find where `prisma.leaveRequest.create(...)` succeeds in the POST handler and add:

```typescript
// Notify HR/owner of new leave request
prisma.notification.create({
  data: {
    companyId: session.companyId!,
    type: "leave_submitted",
    message: `${body.employeeName || "An employee"} submitted a ${body.leaveType || "leave"} request.`,
    link: "/leaves",
  },
}).catch((e) => console.error("[notification]", e));
```

- [ ] **Step 3: Commit**

```bash
cd /e/paynest && git add app/api/leaves/route.ts && git commit -m "feat: create notification when employee submits a leave request"
```

---

## Task 6: Create Notification After Payroll Run

**Files:**
- Modify: `app/api/payroll/calculate/route.ts`

- [ ] **Step 1: Read the calculate route**

Run: `cat /e/paynest/app/api/payroll/calculate/route.ts | tail -40`

- [ ] **Step 2: Add notification after payroll records are saved**

Find the end of the payroll calculation logic (after `prisma.payrollRecord.createMany` or the bulk upsert). Add:

```typescript
// Notify about completed payroll run
prisma.notification.create({
  data: {
    companyId: session.companyId!,
    type: "payroll_completed",
    message: `Payroll run for ${periodMonth}/${periodYear} has been completed.`,
    link: "/payroll",
  },
}).catch((e) => console.error("[notification]", e));
```

- [ ] **Step 3: Commit**

```bash
cd /e/paynest && git add app/api/payroll/calculate/route.ts && git commit -m "feat: create notification after payroll run completes"
```
