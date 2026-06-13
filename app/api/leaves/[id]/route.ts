import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendLeaveDecision } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Dual approval — BOTH the supervisor AND HR must approve.
 *   either side rejected            → "rejected"
 *   both sides approved             → "approved"
 *   otherwise (any still pending)   → "pending"
 */
function calcStatus(supervisorStatus: string, hrStatus: string): string {
  if (supervisorStatus === "rejected" || hrStatus === "rejected") return "rejected";
  if (supervisorStatus === "approved" && hrStatus === "approved") return "approved";
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

      // Supervisor sets their decision; HR's existing decision stays as-is.
      const newSupervisorStatus = body.supervisor_status ?? body.status;
      const newStatus = calcStatus(newSupervisorStatus, existing.hrStatus ?? "pending");
      updateData = { supervisorStatus: newSupervisorStatus, status: newStatus };
    } else {
      // HR / owner / super_admin set the HR decision; supervisor's decision stays as-is.
      const newHrStatus = body.hr_status ?? body.status;
      if (newHrStatus === "approved" || newHrStatus === "rejected" || newHrStatus === "pending") {
        // The owner is the top authority, and online-work requests are HR-only:
        // in both cases the HR/owner decision is final (no second sign-off needed).
        if (session.role === "owner" || existing.leaveType === "online") {
          const newStatus = calcStatus(newHrStatus, newHrStatus);
          updateData = { supervisorStatus: newHrStatus, hrStatus: newHrStatus, status: newStatus, adminNote: body.admin_note ?? existing.adminNote };
        } else {
          const newStatus = calcStatus(existing.supervisorStatus ?? "pending", newHrStatus);
          updateData = { hrStatus: newHrStatus, status: newStatus, adminNote: body.admin_note ?? existing.adminNote };
        }
      } else {
        // No decision supplied — just an admin note update
        updateData = { adminNote: body.admin_note ?? null };
      }
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

    // Audit: log the decision (approve / reject / status update)
    const action = leave.status === "approved" ? "approve" : leave.status === "rejected" ? "reject" : "update";
    await logAudit(session, action, "leave", leave.id, {
      employeeId: leave.employeeId,
      leaveType: leave.leaveType,
      supervisorStatus: leave.supervisorStatus,
      hrStatus: leave.hrStatus,
      status: leave.status,
    });

    // Send email notification to employee
    if (leave.status === "approved" || leave.status === "rejected") {
      try {
        const empUser = await prisma.user.findFirst({
          where: {
            employeeNumber: leave.employeeId ?? undefined,
            companyId: session.companyId,
          },
          select: { email: true },
        });
        if (empUser?.email && leave.employeeName) {
          sendLeaveDecision(
            empUser.email,
            leave.employeeName,
            leave.status as "approved" | "rejected",
            leave.leaveType ?? "Leave",
            leave.startDate?.toISOString().split("T")[0] ?? "",
            leave.endDate?.toISOString().split("T")[0] ?? "",
            body.admin_note ?? null
          );
        }
      } catch (e) {
        console.error("[leave email]", e);
      }

      // Create notification for HR/owner
      const empName = leave.employeeName || "Employee";
      prisma.notification.create({
        data: {
          companyId: session.companyId!,
          type: "leave_decision",
          message: `Leave request for ${empName} has been ${leave.status}.`,
          link: "/leaves",
        },
      }).catch((e: any) => console.error("[notification]", e));
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
