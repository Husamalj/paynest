import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(req);
    const id = parseInt(params.id);
    await prisma.notification.updateMany({
      where: { id, companyId: session.companyId! },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
