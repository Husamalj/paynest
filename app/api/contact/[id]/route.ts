import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";

export const runtime = "nodejs";

// PATCH /api/contact/[id] — mark a request read/unread (super-admin).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    const requestId = Number(id);
    if (!Number.isInteger(requestId)) {
      return NextResponse.json({ error: "Invalid contact request id" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const updated = await prisma.contactRequest.update({
      where: { id: requestId },
      data: { read: body?.read !== false },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

// DELETE /api/contact/[id] — remove a request (super-admin).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    const requestId = Number(id);
    if (!Number.isInteger(requestId)) {
      return NextResponse.json({ error: "Invalid contact request id" }, { status: 400 });
    }
    await prisma.contactRequest.deleteMany({ where: { id: requestId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
