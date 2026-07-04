import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);

    if (!session.companyId) return NextResponse.json({ needsOnboarding: false });

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { onboardingCompleted: true },
    });

    return NextResponse.json({ needsOnboarding: !company?.onboardingCompleted });
  } catch (err) {
    return errorResponse(err);
  }
}
