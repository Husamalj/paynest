import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { getCompanySystemMode } from "@/lib/companyContext";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

export const runtime = "nodejs";

/**
 * GET /api/attendance?employee_id=...&month=M&year=Y
 * Returns the attendance records for an employee in the given period.
 * Employees can only fetch their own; owner/hr can fetch anyone in their company.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const employeeId = url.searchParams.get("employee_id");
    const month = parseInt(url.searchParams.get("month") || "0", 10);
    const year  = parseInt(url.searchParams.get("year")  || "0", 10);
    const pagination = parsePagination(url, { limit: 250 });

    // Employee can only fetch their own data
    let targetEmployeeId: string | undefined;
    if (session.role === "employee") {
      if (!session.employeeNumber) throw new HttpError(404, "Employee number not found");
      targetEmployeeId = session.employeeNumber;
    } else {
      targetEmployeeId = employeeId ?? undefined;
    }

    const mode = await getCompanySystemMode(session.companyId);

    const where: any = { companyId: session.companyId, systemMode: mode };
    if (targetEmployeeId) where.employeeId = targetEmployeeId;
    if (month && year) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end   = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      where.workDate = { gte: start, lte: end };
    }

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        orderBy: { workDate: "asc" },
        ...paginationQuery(pagination),
      }),
      pagination.enabled ? prisma.attendanceRecord.count({ where }) : Promise.resolve(undefined),
    ]);

    // Format times for display
    const formatTime = (d: Date | null) => {
      if (!d) return null;
      const h = d.getUTCHours().toString().padStart(2, "0");
      const m = d.getUTCMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    };

    const out = records.map((r) => ({
      id: r.id,
      employee_id: r.employeeId,
      work_date: r.workDate?.toISOString().substring(0, 10),
      clock_in: formatTime(r.clockIn ?? null),
      clock_out: formatTime(r.clockOut ?? null),
      hours_worked: Number(r.hoursWorked),
    }));
    return withPaginationHeaders(out, pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}
