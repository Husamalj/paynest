import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["owner"]);
    if (session.companyId == null) throw new HttpError(403, "No company scope");

    const { id } = await params;
    const hr = await prisma.user.findFirst({
      where: { id: Number(id), companyId: session.companyId, role: "hr" },
    });
    if (!hr) throw new HttpError(404, "HR user not found");

    if (hr.employeeNumber) {
      await prisma.employee.deleteMany({
        where: { employeeId: hr.employeeNumber, companyId: session.companyId },
      });
    }

    await prisma.user.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true, deleted: hr });
  } catch (err) {
    return errorResponse(err);
  }
}
