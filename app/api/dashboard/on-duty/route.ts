import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * GET /api/dashboard/on-duty
 * Employees scheduled to work TODAY (today's weekday is in their work schedule)
 * and who are NOT on approved leave today.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const tz = settings?.timezone || "Asia/Amman";
    const companyWorkdays = (settings?.workdays || "Sun,Mon,Tue,Wed,Thu").split(",").map((s) => s.trim());

    // Compute "today" in the company's timezone (so the day boundary is local, not UTC)
    const now = new Date();
    let localDate: string; // YYYY-MM-DD in company tz
    let todayKey: string;
    try {
      localDate = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
      const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(now); // Sun..Sat
      todayKey = wd.slice(0, 3);
    } catch {
      localDate = now.toISOString().slice(0, 10);
      todayKey = DAY_KEYS[now.getUTCDay()];
    }
    // Leave dates are stored as date-only (midnight UTC); compare in UTC against the local date
    const startOfToday = new Date(`${localDate}T00:00:00.000Z`);
    const endOfToday = new Date(`${localDate}T23:59:59.999Z`);

    // Exclude owner/hr/super_admin records
    const adminUsers = await prisma.user.findMany({
      where: { companyId: session.companyId, role: { in: ["owner", "hr", "super_admin"] } },
      select: { employeeNumber: true },
    });
    const adminNums = adminUsers.map((u) => u.employeeNumber).filter(Boolean) as string[];

    const employees = await prisma.employee.findMany({
      where: { companyId: session.companyId, ...(adminNums.length ? { NOT: { employeeId: { in: adminNums } } } : {}) },
      select: { employeeId: true, name: true, jobTitle: true, department: true, photoUrl: true, workdays: true, workType: true },
      orderBy: { name: "asc" },
    });

    // Who is on approved leave / departure today
    const leaves = await prisma.leaveRequest.findMany({
      where: { companyId: session.companyId, status: "approved", startDate: { lte: endOfToday }, endDate: { gte: startOfToday } },
      select: { employeeId: true, employeeName: true, leaveType: true },
    });
    // Online-work approvals mean the person IS working (just remotely) — not on leave.
    const onLeave = new Set(leaves.filter((l) => l.leaveType !== "online").map((l) => l.employeeId));
    const onLeaveList = leaves
      .filter((l) => l.leaveType !== "permission" && l.leaveType !== "online")
      .map((l) => ({ employee_id: l.employeeId, name: l.employeeName, leave_type: l.leaveType }));
    const onDepartureList = leaves
      .filter((l) => l.leaveType === "permission")
      .map((l) => ({ employee_id: l.employeeId, name: l.employeeName }));

    // Dedupe by employeeId (employee can exist per systemMode)
    const seen = new Set<string>();
    const onDuty = employees
      .filter((e) => {
        if (!e.employeeId || seen.has(e.employeeId)) return false;
        if (onLeave.has(e.employeeId)) return false;
        const days = e.workdays ? e.workdays.split(",").map((s) => s.trim()) : companyWorkdays;
        if (!days.includes(todayKey)) return false;
        seen.add(e.employeeId);
        return true;
      })
      .map((e) => ({ employee_id: e.employeeId, name: e.name, job_title: e.jobTitle, department: e.department, photo_url: e.photoUrl }));

    return NextResponse.json({ date: startOfToday.toISOString().substring(0, 10), weekday: todayKey, on_duty: onDuty, on_leave: onLeaveList, on_departure: onDepartureList });
  } catch (err) {
    return errorResponse(err);
  }
}
