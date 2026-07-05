import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

// DELETE — HR/owner removes a custom request type.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireAuth(req);
    requireRole(s, ["owner", "hr", "super_admin"]);
    await requirePageAccess(s, "customRequests");
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const t = await prisma.requestType.findFirst({ where: { id: Number(id), companyId: s.companyId } });
    if (!t) throw new HttpError(404, "Not found");
    await prisma.requestType.delete({ where: { id: t.id } });
    return NextResponse.json({ success: true });
  } catch (e) { return errorResponse(e); }
}
