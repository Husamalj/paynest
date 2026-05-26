import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const employee_id = url.searchParams.get("employee_id");

    const where: any = { companyId: session.companyId };

    if (session.role === "employee") {
      // Employee sees their own leaves only
      where.employeeId = session.employeeNumber;
    } else if (employee_id) {
      where.employeeId = employee_id;
    }
    if (status) where.status = status;

    let leaves: any[];
    try {
      leaves = await prisma.leaveRequest.findMany({ where, orderBy: { createdAt: "desc" } });
    } catch {
      // Fallback: new columns may not exist yet in DB — use raw query with only original columns
      const cond = session.role === "employee"
        ? `AND employee_id = '${where.employeeId}'`
        : employee_id ? `AND employee_id = '${employee_id}'` : "";
      const statusCond = status ? `AND status = '${status}'` : "";
      leaves = await prisma.$queryRawUnsafe(
        `SELECT id, company_id, employee_id, employee_name, leave_type, start_date, end_date, days_count, reason, status, admin_note, created_at, updated_at FROM leave_requests WHERE company_id = ${session.companyId} ${cond} ${statusCond} ORDER BY created_at DESC`
      ) as any[];
    }
    return NextResponse.json(leaves);
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

    // Get all direct subordinates
    const subs = await prisma.employee.findMany({
      where: { supervisorId: supervisor.id, companyId: session.companyId },
      select: { employeeId: true, name: true },
    });
    const subIds = subs.map((s) => s.employeeId).filter(Boolean) as string[];
    if (subIds.length === 0) return NextResponse.json([]);

    const leaves = await prisma.leaveRequest.findMany({
      where: { companyId: session.companyId, employeeId: { in: subIds } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(leaves);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
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

    // Check if this employee has a supervisor — if so, supervisor must approve too
    const empRecord = await prisma.employee.findFirst({
      where: { employeeId: finalEmployeeId, companyId: session.companyId },
      select: { supervisorId: true },
    });
    const hasSupervisor = !!empRecord?.supervisorId;

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
    return NextResponse.json(leave);
  } catch (err) {
    return errorResponse(err);
  }
}
