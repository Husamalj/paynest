import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requirePageAccess, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

// PUT — HR/owner approves or rejects a custom request.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireAuth(req);
    requireRole(s, ["owner", "hr", "super_admin"]);
    await requirePageAccess(s, "customRequests");
    if (s.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;
    const { status, admin_note } = await req.json();
    if (!["approved", "rejected", "pending"].includes(status)) throw new HttpError(400, "Invalid status");

    const row = await prisma.customRequest.findFirst({ where: { id: Number(id), companyId: s.companyId } });
    if (!row) throw new HttpError(404, "Not found");

    const updated = await prisma.customRequest.update({
      where: { id: row.id },
      data: { status, adminNote: admin_note ?? row.adminNote },
    });
    return NextResponse.json(updated);
  } catch (e) { return errorResponse(e); }
}
