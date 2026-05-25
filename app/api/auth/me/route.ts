import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { company: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.companyId,
        companyId: user.companyId,
        employee_number: user.employeeNumber,
        employeeNumber: user.employeeNumber,
        must_change_password: user.mustChangePassword,
        mustChangePassword: user.mustChangePassword,
        company_name: user.company?.name ?? null,
        company_slug: user.company?.slug ?? null,
        is_active: user.company?.isActive ?? null,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
