import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const hrs = await prisma.user.findMany({
      where: { companyId: session.companyId, role: "hr" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true,
        companyId: true, employeeNumber: true, mustChangePassword: true, createdAt: true,
      },
    });

    return NextResponse.json(hrs);
  } catch (err) {
    return errorResponse(err);
  }
}
