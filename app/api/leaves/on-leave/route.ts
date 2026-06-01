import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/leaves/on-leave
 * Returns employees who are on APPROVED leave today — visible to everyone in
 * the company so colleagues know who's out of office.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        companyId: session.companyId,
        status: "approved",
        startDate: { lte: endOfToday },
        endDate: { gte: startOfToday },
      },
      orderBy: { endDate: "asc" },
      select: { id: true, employeeId: true, employeeName: true, leaveType: true, startDate: true, endDate: true },
    });

    const out = leaves.map((l) => ({
      id: l.id,
      employee_id: l.employeeId,
      employee_name: l.employeeName,
      leave_type: l.leaveType,
      start_date: l.startDate?.toISOString().substring(0, 10),
      end_date: l.endDate?.toISOString().substring(0, 10),
    }));
    return NextResponse.json(out);
  } catch (err) {
    return errorResponse(err);
  }
}
