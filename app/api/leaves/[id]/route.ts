import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const { status, admin_note } = await req.json();

    const leave = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: { status, adminNote: admin_note ?? null },
    });
    if (!leave || leave.companyId !== session.companyId) throw new HttpError(404, "Leave request not found");

    // Update leave balances on approval
    if (status === "approved" && leave.startDate) {
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

export { PUT as PATCH };

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

    // Reverse balance if was approved
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
