import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * PUT /api/advances/[id] — HR/owner approve or reject an advance request.
 * On approval, the advance is turned into salary deduction(s): the full amount
 * for the current month, or split into N monthly installments.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "advances");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const body = await req.json();
    const status = body.status; // "approved" | "rejected"

    const adv = await prisma.advanceRequest.findFirst({
      where: { id: Number(id), companyId: session.companyId },
    });
    if (!adv) throw new HttpError(404, "Advance request not found");

    if (status === "approved" && adv.status !== "approved") {
      const settings = await prisma.companySettings.findFirst({ where: { companyId: session.companyId } });
      const mode = settings?.systemMode ?? "daily";
      const total = Number(adv.amount);
      const n = Math.min(12, Math.max(1, adv.installments || 1));
      const perInstallment = Math.round((total / n) * 100) / 100;

      const now = new Date();
      const rows = Array.from({ length: n }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        // last installment absorbs the rounding remainder
        const amt = i === n - 1 ? Math.round((total - perInstallment * (n - 1)) * 100) / 100 : perInstallment;
        return {
          companyId: session.companyId!,
          employeeId: adv.employeeId,
          employeeName: adv.employeeName,
          type: "deduction",
          reason: n > 1 ? `سلفة / Advance (${i + 1}/${n})` : "سلفة / Advance",
          amount: amt,
          periodMonth: d.getMonth() + 1,
          periodYear: d.getFullYear(),
          systemMode: mode,
        };
      });
      await prisma.bonusDeduction.createMany({ data: rows });
    }

    const updated = await prisma.advanceRequest.update({
      where: { id: Number(id) },
      data: { status, adminNote: body.admin_note ?? adv.adminNote },
    });

    // Notify the employee
    if (status === "approved" || status === "rejected") {
      prisma.notification.create({
        data: {
          companyId: session.companyId,
          type: "advance_decision",
          message: `Your salary advance request has been ${status}.`,
          link: "/employee-portal",
        },
      }).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin", "employee"]);
    await requirePageAccess(session, "advances");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    // Employees may only cancel their own pending advance request.
    if (session.role === "employee") {
      const adv = await prisma.advanceRequest.findFirst({ where: { id: Number(id), companyId: session.companyId } });
      if (!adv) throw new HttpError(404, "Advance request not found");
      if (adv.employeeId !== session.employeeNumber) throw new HttpError(403, "Not your request");
      if (adv.status !== "pending") throw new HttpError(400, "Can only cancel a pending request");
    }
    const r = await prisma.advanceRequest.deleteMany({ where: { id: Number(id), companyId: session.companyId } });
    if (r.count === 0) throw new HttpError(404, "Advance request not found");
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
