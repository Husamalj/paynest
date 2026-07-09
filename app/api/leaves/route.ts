import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    await requirePageAccess(session, "leaves");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const employee_id = url.searchParams.get("employee_id");
    const pagination = parsePagination(url, { limit: 100 });

    const where: any = { companyId: session.companyId };

    if (session.role === "employee") {
      // Employee sees their own leaves only
      where.employeeId = session.employeeNumber;
    } else {
      // HR / owner / super_admin — see all leave requests (read-only view)
      if (employee_id) where.employeeId = employee_id;
    }
    if (status) where.status = status;

    let leaves: any[];
    try {
      leaves = await prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationQuery(pagination),
      });
    } catch {
      // Fallback: new columns may not exist yet in DB — use raw query with only original columns
      const employeeFilter = where.employeeId ? Prisma.sql`AND employee_id = ${where.employeeId}` : Prisma.empty;
      const statusFilter = status ? Prisma.sql`AND status = ${status}` : Prisma.empty;
      leaves = await prisma.$queryRaw(
        Prisma.sql`
          SELECT id, company_id, employee_id, employee_name, leave_type, start_date, end_date, days_count, reason, status, admin_note, created_at, updated_at
          FROM leave_requests
          WHERE company_id = ${session.companyId}
          ${employeeFilter}
          ${statusFilter}
          ORDER BY created_at DESC
          ${pagination.enabled ? Prisma.sql`LIMIT ${pagination.limit} OFFSET ${pagination.skip}` : Prisma.empty}
        `,
      ) as any[];
    }
    const total = pagination.enabled ? await prisma.leaveRequest.count({ where }) : undefined;
    return withPaginationHeaders(leaves, pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}

// GET subordinate leave requests (for supervisor view)
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    // Find this employee's record
    const supervisor = await prisma.employee.findFirst({
      where: { employeeId: session.employeeNumber ?? "", companyId: session.companyId },
      select: { id: true },
    });
    if (!supervisor) throw new HttpError(403, "Supervisor record not found");

    // Get all direct subordinates (legacy supervisorId OR supervisorIds array)
    const subs = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        OR: [
          { supervisorId: supervisor.id },
          { supervisorIds: { has: supervisor.id } },
        ],
      },
      select: { employeeId: true, name: true },
    });
    const subIds = subs.map((s) => s.employeeId).filter(Boolean) as string[];
    if (subIds.length === 0) return NextResponse.json([]);

    const url = new URL(req.url);
    const pagination = parsePagination(url, { limit: 100 });
    const where = { companyId: session.companyId, employeeId: { in: subIds } };
    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationQuery(pagination),
      }),
      pagination.enabled ? prisma.leaveRequest.count({ where }) : Promise.resolve(undefined),
    ]);
    return withPaginationHeaders(leaves, pagination, total);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    await requirePageAccess(session, "leaves");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const body = await req.json();
    let finalEmployeeId = body.employee_id;
    let finalEmployeeName = body.employee_name;

    if (session.role === "employee") {
      finalEmployeeId = session.employeeNumber;
      finalEmployeeName = session.name;
    }

    if (!finalEmployeeId || !body.leave_type || !body.start_date || !body.end_date) {
      throw new HttpError(400, "Missing required fields");
    }

    // Enforce the annual/sick balance — unpaid (and other types) are unlimited.
    const lt = body.leave_type;
    const days = Number(body.days_count) || 0;
    if ((lt === "annual" || lt === "sick") && days > 0) {
      const year = new Date(body.start_date).getFullYear();
      const bal = await prisma.leaveBalance.findFirst({
        where: { employeeId: finalEmployeeId, year, companyId: session.companyId },
      });
      const total = lt === "annual" ? (bal?.annualTotal ?? 14) : (bal?.sickTotal ?? 14);
      const used = lt === "annual" ? (bal?.annualUsed ?? 0) : (bal?.sickUsed ?? 0);
      const remaining = total - used;
      if (days > remaining) {
        throw new HttpError(400, `LEAVE_BALANCE_EXCEEDED:${lt}:${Math.max(0, remaining)}`);
      }
    }

    // Check if this employee has any supervisor — if so, supervisor must approve too
    const empRecord = await prisma.employee.findFirst({
      where: { employeeId: finalEmployeeId, companyId: session.companyId },
      select: { supervisorId: true, supervisorIds: true },
    });
    const hasSupervisor = !!empRecord?.supervisorId || (empRecord?.supervisorIds?.length ?? 0) > 0;

    const leave = await prisma.leaveRequest.create({
      data: {
        companyId: session.companyId,
        employeeId: finalEmployeeId,
        employeeName: finalEmployeeName ?? finalEmployeeId,
        leaveType: body.leave_type,
        startDate: new Date(body.start_date),
        endDate: new Date(body.end_date),
        daysCount: body.days_count ?? null,
        reason: body.reason ?? null,
        attachmentUrl: body.attachment_url ?? null,
        // If no supervisor, skip supervisor approval
        supervisorStatus: hasSupervisor ? "pending" : "approved",
        hrStatus: "pending",
        status: "pending",
      },
    });

    // Notify HR/owner of new leave request
    prisma.notification.create({
      data: {
        companyId: session.companyId,
        type: "leave_submitted",
        message: `${finalEmployeeName || "An employee"} submitted a ${body.leave_type || "leave"} request.`,
        link: "/leaves",
      },
    }).catch((e: any) => console.error("[notification]", e));

    return NextResponse.json(leave);
  } catch (err) {
    return errorResponse(err);
  }
}
