import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * PATCH /api/upload/[id]  { period_month, period_year }
 * Update the month/year label a file belongs to. This is a display label only
 * — it does not move the underlying payroll/attendance data.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "upload");
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { id } = await params;
    const body = await req.json();
    const month = Number(body.period_month);
    const year = Number(body.period_year);
    if (!month || month < 1 || month > 12) throw new HttpError(400, "Invalid month");
    if (!year || year < 2000 || year > 2100) throw new HttpError(400, "Invalid year");

    const file = await prisma.uploadedFile.findFirst({
      where: { id: Number(id), companyId: session.companyId },
      select: { id: true },
    });
    if (!file) throw new HttpError(404, "File not found");

    const updated = await prisma.uploadedFile.update({
      where: { id: file.id },
      data: { periodMonth: month, periodYear: year },
      select: { id: true, periodMonth: true, periodYear: true },
    });
    return NextResponse.json({ success: true, ...updated });
  } catch (err) {
    return errorResponse(err);
  }
}
