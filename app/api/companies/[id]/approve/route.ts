import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse, HttpError } from "@/lib/auth";
import { sendWelcomeCompany } from "@/lib/email";
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
      data: { status: "active", isActive: true },
    });
    await logAuditForCompany(session, company.id, "approve", "company", company.id, {
      status: { from: current.status, to: company.status },
      isActive: { from: current.isActive, to: company.isActive },
    });

    // Send welcome email to company owner
    const owner = await prisma.user.findFirst({
      where: { companyId: company.id, role: "owner" },
      select: { email: true, name: true },
    });
    if (owner?.email) {
      sendWelcomeCompany(owner.email, company.name);
    }

    return NextResponse.json(company);
  } catch (err) {
    return errorResponse(err);
  }
}
