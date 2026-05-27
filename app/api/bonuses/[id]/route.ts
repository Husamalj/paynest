import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const result = await prisma.bonusDeduction.deleteMany({
      where: { id: Number(id), companyId: session.companyId },
    });
    if (result.count === 0) throw new HttpError(404, "Record not found");
    await logAudit(session, "delete", "bonus", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
