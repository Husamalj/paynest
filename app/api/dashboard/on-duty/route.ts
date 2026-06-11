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

    const now = new Date();
    const todayKey = DAY_KEYS[now.getDay()];
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
    const companyWorkdays = (settings?.workdays || "Sun,Mon,Tue,Wed,Thu").split(",").map((s) => s.trim());

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

    // Who is on approved leave today
    const leaves = await prisma.leaveRequest.findMany({
      where: { companyId: session.companyId, status: "approved", startDate: { lte: endOfToday }, endDate: { gte: startOfToday } },
      select: { employeeId: true },
    });
    const onLeave = new Set(leaves.map((l) => l.employeeId));

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

    return NextResponse.json({ date: startOfToday.toISOString().substring(0, 10), weekday: todayKey, on_duty: onDuty });
  } catch (err) {
    return errorResponse(err);
  }
}
