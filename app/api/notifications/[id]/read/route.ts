import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    await prisma.notification.updateMany({
      where: { id, companyId: session.companyId! },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
