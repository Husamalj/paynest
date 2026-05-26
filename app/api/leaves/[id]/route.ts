import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Only supervisor decides. HR can view but never changes the outcome.
 *   supervisor pending  → "pending"
 *   supervisor approved → "approved"
 *   supervisor rejected → "rejected"
 */
function calcStatus(supervisorStatus: string): string {
  if (supervisorStatus === "approved") return "approved";
  if (supervisorStatus === "rejected") return "rejected";
  return "pending";
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.leaveRequest.findFirst({
      where: { id: Number(id), companyId: session.companyId },
    });
    if (!existing) throw new HttpError(404, "Leave request not found");

    let updateData: any = {};

    if (session.role === "employee") {
      // Must be this employee's supervisor
      const supervisorRecord = await prisma.employee.findFirst({
        where: { employeeId: session.employeeNumber ?? "", companyId: session.companyId },
        select: { id: true },
      });
      if (!supervisorRecord) throw new HttpError(403, "Not a supervisor");

      const subordinate = await prisma.employee.findFirst({
        where: {
          employeeId: existing.employeeId ?? "",
          companyId: session.companyId,
          OR: [
            { supervisorId: supervisorRecord.id },
            { supervisorIds: { has: supervisorRecord.id } },
          ],
        },
      });
      if (!subordinate) throw new HttpError(403, "This employee is not your subordinate");

      const newSupervisorStatus = body.supervisor_status ?? body.status;
      const newStatus = calcStatus(newSupervisorStatus);
      updateData = { supervisorStatus: newSupervisorStatus, status: newStatus };
    } else {
      // HR / owner / super_admin — view only, cannot change approval status
      // They can only add an admin note
      updateData = { adminNote: body.admin_note ?? null };
    }

    const leave = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Update leave balances when fully approved
    if (leave.status === "approved" && existing.status !== "approved" && leave.startDate) {
      const leaveYear = new Date(leave.startDate).getFullYear();
      if (leave.leaveType === "annual") {
        await prisma.leaveBalance.upsert({
          where: { employeeId_year: { employeeId: leave.employeeId ?? "", year: leaveYear } },
          create: { companyId: session.companyId, employeeId: leave.employeeId, year: leaveYear, annualUsed: leave.daysCount ?? 0 },
          update: { annualUsed: { increment: leave.daysCount ?? 0 } },
        });
      } else if (leave.leaveType === "sick") {
        await prisma.leaveBalance.upsert({
          where: { employeeId_year: { employeeId: leave.employeeId ?? "", year: leaveYear } },
          create: { companyId: session.companyId, employeeId: leave.employeeId, year: leaveYear, sickUsed: leave.daysCount ?? 0 },
          update: { sickUsed: { increment: leave.daysCount ?? 0 } },
        });
      }
    }

    return NextResponse.json(leave);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const leave = await prisma.leaveRequest.findFirst({
      where: { id: Number(id), companyId: session.companyId },
    });
    if (!leave) throw new HttpError(404, "Leave request not found");

    if (leave.status === "approved" && leave.startDate && leave.daysCount) {
      const leaveYear = new Date(leave.startDate).getFullYear();
      if (leave.leaveType === "annual") {
        await prisma.leaveBalance.updateMany({
          where: { employeeId: leave.employeeId ?? "", year: leaveYear, companyId: session.companyId },
          data: { annualUsed: { decrement: leave.daysCount } },
        });
      } else if (leave.leaveType === "sick") {
        await prisma.leaveBalance.updateMany({
          where: { employeeId: leave.employeeId ?? "", year: leaveYear, companyId: session.companyId },
          data: { sickUsed: { decrement: leave.daysCount } },
        });
      }
    }

    await prisma.leaveRequest.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
