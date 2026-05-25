import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: { status: "active", isActive: true },
    });
    if (!company) throw new HttpError(404, "Company not found");
    return NextResponse.json(company);
  } catch (err) {
    return errorResponse(err);
  }
}
