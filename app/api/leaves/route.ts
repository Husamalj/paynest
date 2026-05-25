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
      where.employeeId = session.employeeNumber;
    } else if (employee_id) {
      where.employeeId = employee_id;
    }
    if (status) where.status = status;

    const leaves = await prisma.leaveRequest.findMany({ where, orderBy: { createdAt: "desc" } });
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
        status: "pending",
      },
    });
    return NextResponse.json(leave);
  } catch (err) {
    return errorResponse(err);
  }
}
