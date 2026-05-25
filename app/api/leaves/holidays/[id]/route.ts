import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner", "hr", "super_admin"]);
    const { id } = await params;
    await prisma.officialHoliday.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
