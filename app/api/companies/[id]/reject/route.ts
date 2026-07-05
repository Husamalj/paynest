import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { logAuditForCompany } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ["super_admin"]);
    const { id } = await params;
    const current = await prisma.company.findUnique({ where: { id: Number(id) } });
    if (!current) throw new HttpError(404, "Company not found");
    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: { status: "rejected", isActive: false },
    });
    await logAuditForCompany(session, company.id, "reject", "company", company.id, {
      status: { from: current.status, to: company.status },
      isActive: { from: current.isActive, to: company.isActive },
    });
    return NextResponse.json(company);
  } catch (err) {
    return errorResponse(err);
  }
}
