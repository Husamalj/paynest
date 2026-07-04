import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);

    if (!session.companyId) return NextResponse.json({ ok: true });

    await prisma.company.update({
      where: { id: session.companyId },
      data: { onboardingCompleted: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
