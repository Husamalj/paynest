import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    await requirePageAccess(session, "leaves");
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    // Scope by companyId to prevent cross-company deletions
    const result = await prisma.officialHoliday.deleteMany({
      where: { id: Number(id), companyId: session.companyId },
    });
    if (result.count === 0) throw new HttpError(404, "Holiday not found");
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
