import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    if (session.companyId == null) throw new HttpError(403, "No company scope");
    const { id } = await params;

    const result = await prisma.bonusDeduction.deleteMany({
      where: { id: Number(id), companyId: session.companyId },
    });
    if (result.count === 0) throw new HttpError(404, "Record not found");
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
