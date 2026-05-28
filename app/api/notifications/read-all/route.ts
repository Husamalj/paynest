import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const session = await requireAuth(req);
    await prisma.notification.updateMany({
      where: { companyId: session.companyId!, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
