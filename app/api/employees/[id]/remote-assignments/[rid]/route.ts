import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id, rid } = await params;

    await prisma.remoteAssignment.deleteMany({
      where: { id: Number(rid), employeeId: id, companyId: session.companyId },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
